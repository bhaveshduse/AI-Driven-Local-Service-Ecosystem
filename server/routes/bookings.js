import express from 'express';
import Booking from '../models/Booking.js';
import Service from '../models/Service.js';
import Vendor from '../models/Vendor.js';
import User from '../models/User.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js'; // Ensure both are imported
import sendEmail from '../utils/sendEmail.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure Multer for payment screenshots
const paymentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/payments/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'payment-' + Date.now() + path.extname(file.originalname));
  }
});
const uploadPayment = multer({ storage: paymentStorage });

const router = express.Router();

/**
 * Calculates distance between two lat/lon coordinates in kilometers using the Haversine formula.
 */
function getDistanceInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Protect all booking routes
router.use(authenticateToken);

// Create booking
router.post('/', async (req, res) => {
  try {
    const { role, _id } = req.user;
    const { vendor: vendorId, address } = req.body;
    let customerId;

    if (role === 'customer') {
      customerId = _id;
    } else if (role === 'admin') {
      if (!req.body.customer) {
        return res.status(400).json({ error: 'Admin must specify a customer for the booking.' });
      }
      customerId = req.body.customer;
    } else {
      return res.status(403).json({ error: 'Only customers or admins can book services.' });
    }

    // --- LOCATION VALIDATION ---
    if (!address || !address.coordinates || !address.coordinates.lat || !address.coordinates.lon) {
      return res.status(400).json({ error: 'A full address with coordinates is required to create a booking.' });
    }

    // Fetch the vendor's user data to get their location and service radius
    const vendor = await Vendor.findById(vendorId).populate({
      path: 'user',
      select: 'address serviceRadiusKm' // Select only necessary fields
    });

    if (!vendor || !vendor.user) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    const vendorUser = vendor.user;

    // --- DOUBLE BOOKING SHIELD (Accurate Overlap & Overrun Buffer) ---
    // Prevent booking if the vendor already has an active job overlapping with this time slot
    if (req.body.scheduledDate) {
      const durationMinutes = req.body.duration || 60;
      const bufferMinutes = 30; // 30-minute buffer for job overruns and travel time
      
      const newStart = new Date(req.body.scheduledDate).getTime();
      const newEnd = newStart + ((durationMinutes + bufferMinutes) * 60 * 1000);

      // Fetch active bookings within a 24-hour window to catch all potential overlaps securely
      const searchStart = new Date(newStart - 24 * 60 * 60 * 1000);
      const searchEnd = new Date(newStart + 24 * 60 * 60 * 1000);

      const dailyBookings = await Booking.find({
        vendor: vendorId,
        scheduledDate: { $gte: searchStart, $lte: searchEnd },
        status: { $nin: ['cancelled', 'rejected', 'completed'] }
      }).populate('service', 'duration');

      const hasConflict = dailyBookings.some(b => {
        const existingStart = new Date(b.scheduledDate).getTime();
        const existingDuration = (b.service && b.service.duration) ? Number(b.service.duration) : 60;
        const existingEnd = existingStart + ((existingDuration + bufferMinutes) * 60 * 1000);

        // Overlap formula: (Start A < End B) AND (End A > Start B)
        return (newStart < existingEnd && newEnd > existingStart);
      });

      if (hasConflict) {
        return res.status(400).json({ error: `This provider is booked around this time. To account for job overruns and travel, please choose a time further away.` });
      }
    }

    // Check if vendor's location and radius are set and if the booking is within range
    if (vendorUser.address?.coordinates && vendorUser.address.coordinates.length === 2 && vendorUser.serviceRadiusKm > 0) {
      const [vendorLon, vendorLat] = vendorUser.address.coordinates;
      const { lat: bookingLat, lon: bookingLon } = address.coordinates;
      const distance = getDistanceInKm(vendorLat, vendorLon, bookingLat, bookingLon);

      if (distance > vendorUser.serviceRadiusKm) {
        return res.status(400).json({ error: `This provider does not serve the selected location. They serve within a ${vendorUser.serviceRadiusKm}km radius.` });
      }
    } else {
      // To be safe, you could reject bookings if the vendor's service area is not configured.
      // For now, we'll just log a warning.
      console.warn(`Vendor ${vendorUser._id} does not have location or service radius configured. Location check skipped.`);
    }

    // Fetch the actual service from DB to use the real price (never trust client-provided price)
    const serviceDoc = await Service.findById(req.body.service).select('pricing.amount title');
    if (!serviceDoc) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    // Check if the frontend specifies manual payment (Escrow)
    const isManual = req.body.paymentMethod === 'manual';

    // --- COMMISSION CALCULATION (10% Platform Fee) ---
    const priceAmount = serviceDoc.pricing.amount || 0;
    const priceData = {
      amount: priceAmount,
      platformFee: priceAmount * 0.10,
      vendorPayout: priceAmount * 0.90
    };

    const booking = new Booking({
      customer: customerId,
      vendor: vendorId,
      service: serviceDoc._id,
      scheduledDate: req.body.scheduledDate,
      address: req.body.address,
      notes: req.body.notes || {},
      price: priceData,
      // Payment method and status — always start as pending; Razorpay/webhook updates to paid
      payment: { 
        method: isManual ? 'manual' : 'razorpay',
        status: 'pending'
      },
    });

    // Add initial timeline event for better tracking
    booking.timeline.push({
      status: 'pending',
      note: `Booking created by ${role}.`,
    });

    await booking.save();

    // Populate for response
    await booking.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'vendor', populate: { path: 'user', select: 'name email phone' } },
      { path: 'service', select: 'title category pricing' }
    ]);

    // Send real-time notification to vendor
    if (booking.vendor?.user?._id) {
      req.io.to(booking.vendor.user._id.toString()).emit('new-booking', {
        bookingId: booking._id,
        customer: booking.customer,
        service: booking.service,
        scheduledDate: booking.scheduledDate,
      });

      // --- 120-SECOND PANIC TIMER ---
      // Automatically cancel the booking if the vendor does not accept it within 2 minutes
      setTimeout(async () => {
        try {
          const checkBooking = await Booking.findById(booking._id);
          if (checkBooking && checkBooking.status === 'pending') {
            checkBooking.status = 'cancelled';
            if (!checkBooking.notes) checkBooking.notes = {};
            checkBooking.notes.systemNotes = 'Booking automatically cancelled due to vendor timeout (120 seconds).';
            checkBooking.timeline.push({
              status: 'cancelled',
              note: 'Auto-cancelled by system (120s panic timer).',
              timestamp: new Date()
            });
            await checkBooking.save();
            
            // Notify both parties of the cancellation
            req.io.to(checkBooking.customer.toString()).emit('booking-status-update', {
              bookingId: checkBooking._id.toString(), status: 'cancelled', updatedBy: 'system'
            });
            req.io.to(vendorUser._id.toString()).emit('booking-status-update', {
              bookingId: checkBooking._id.toString(), status: 'cancelled', updatedBy: 'system'
            });
          }
        } catch (err) {
          console.error('Error in 120s panic timer:', err);
        }
      }, 120000); // 120 seconds
    }
    
    res.status(201).json(booking);
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create booking with Manual Escrow (Screenshot Upload)
router.post('/request', uploadPayment.single('screenshot'), async (req, res) => {
  try {
    const { role, _id } = req.user;
    if (role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can request bookings.' });
    }

    const { vendor: vendorId, service, scheduledDate, address, notes } = req.body;

    // --- LOCATION VALIDATION ---
    let parsedAddress;
    try {
      parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid address format.' });
    }

    if (!parsedAddress || !parsedAddress.coordinates || !parsedAddress.coordinates.lat || !parsedAddress.coordinates.lon) {
      return res.status(400).json({ error: 'A full address with coordinates is required.' });
    }

    // Fetch the actual service from DB to use the real price (never trust client-provided price)
    const serviceDoc = await Service.findById(service).select('pricing.amount');
    if (!serviceDoc) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    const priceAmount = serviceDoc.pricing.amount || 0;
    const parsedPrice = {
      amount: priceAmount,
      platformFee: priceAmount * 0.10,
      vendorPayout: priceAmount * 0.90
    };

    // Verify Vendor
    const vendor = await Vendor.findById(vendorId).populate('user', 'address serviceRadiusKm');
    if (!vendor || !vendor.user) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    // --- DOUBLE BOOKING SHIELD (Accurate Overlap & Overrun Buffer) ---
    if (scheduledDate) {
      const durationMinutes = req.body.duration || 60;
      const bufferMinutes = 30; // 30-minute buffer for job overruns and travel time
      
      const newStart = new Date(scheduledDate).getTime();
      const newEnd = newStart + ((durationMinutes + bufferMinutes) * 60 * 1000);

      // Fetch active bookings within a 24-hour window to catch all potential overlaps securely
      const searchStart = new Date(newStart - 24 * 60 * 60 * 1000);
      const searchEnd = new Date(newStart + 24 * 60 * 60 * 1000);

      const dailyBookings = await Booking.find({
        vendor: vendorId,
        scheduledDate: { $gte: searchStart, $lte: searchEnd },
        status: { $nin: ['cancelled', 'rejected', 'completed'] }
      }).populate('service', 'duration');

      const hasConflict = dailyBookings.some(b => {
        const existingStart = new Date(b.scheduledDate).getTime();
        const existingDuration = (b.service && b.service.duration) ? Number(b.service.duration) : 60;
        const existingEnd = existingStart + ((existingDuration + bufferMinutes) * 60 * 1000);

        // Overlap formula: (Start A < End B) AND (End A > Start B)
        return (newStart < existingEnd && newEnd > existingStart);
      });

      if (hasConflict) {
        return res.status(400).json({ error: `This provider is booked around this time. To account for job overruns and travel, please choose a time further away.` });
      }
    }

    // Verify Screenshot
    if (!req.file) {
      return res.status(400).json({ error: 'Payment screenshot is required for manual escrow.' });
    }

    const screenshotPath = req.file.path.replace(/\\/g, '/');

    const booking = new Booking({
      customer: _id,
      vendor: vendorId,
      service: serviceDoc._id,
      scheduledDate: scheduledDate,
      price: parsedPrice,
      address: parsedAddress,
      notes: notes ? { customerNotes: notes } : {},
      status: 'pending', // Will stay pending until admin verifies the screenshot
      payment: { 
        status: 'verification-pending', 
        screenshot: screenshotPath, // Save the screenshot path to DB
        paidAt: new Date() 
      },
    });

    booking.timeline.push({
      status: 'pending',
      note: 'Booking requested. Pending Admin Escrow Verification.',
    });

    await booking.save();

    // Do NOT notify the vendor yet. The Admin must verify the screenshot first.
    // Notify Admins instead
    const admins = await User.find({ role: 'admin' }).select('_id');
    admins.forEach(admin => {
      req.io.to(admin._id.toString()).emit('new-escrow-request', { bookingId: booking._id });
    });
    
    res.status(201).json(booking);
  } catch (error) {
    console.error("Manual Escrow Booking Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload Payment Proof (For Two-Step Escrow flow)
router.post('/:id/payment-proof', uploadPayment.single('screenshot'), async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can upload payment proofs.' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (!booking.customer.equals(req.user._id)) return res.status(403).json({ error: 'Not your booking.' });

    if (!req.file) return res.status(400).json({ error: 'Screenshot is required.' });

    booking.payment.status = 'verification-pending';
    booking.payment.screenshot = req.file.path.replace(/\\/g, '/');
    booking.payment.paidAt = new Date();

    booking.timeline.push({ status: booking.status, note: 'Customer uploaded payment proof. Pending Admin verification.' });
    await booking.save();

    // Notify Admins
    const admins = await User.find({ role: 'admin' }).select('_id');
    admins.forEach(admin => {
      req.io.to(admin._id.toString()).emit('new-escrow-request', { bookingId: booking._id });
    });

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's bookings
router.get('/', async (req, res) => {
  try {
    const { view } = req.query; // Changed from 'status' to 'view'
    let query = {};
    if (req.user.role === 'customer') {
      query = { customer: req.user._id };
    } else if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ user: req.user._id });
      if (!vendor) {
        // This case should be rare if the user has a vendor role but it's good to handle.
        return res.json([]);
      }
      query = { vendor: vendor._id };
    } else if (req.user.role === 'admin') {
      // For admins, query is empty, fetching all bookings.
      query = {};
    } else {
      // For any other unhandled role or no role, return empty.
      return res.json([]);
    }

    // New view-based filtering logic. The backend now determines what each view means.
    if (view && view !== 'all') {
      switch(view) {
        case 'upcoming':
          // An "upcoming" booking is one in the future that has not been finalized (completed/cancelled/rejected).
          query.scheduledDate = { $gte: new Date() };
          query.status = { $nin: ['completed', 'cancelled', 'rejected'] };
          break;
        case 'pending':
          query.status = { $in: ['pending', 'awaiting-payment'] };
          break;
        case 'confirmed':
          query.status = 'confirmed';
          break;
        case 'in-progress':
          // The "In Progress" tab should show jobs that are actively being worked on
          // AND jobs that are awaiting OTP verification.
          query.status = { $in: ['in-progress', 'verification-pending'] };
          break;
        case 'completed':
          query.status = 'completed';
          break;
        case 'cancelled':
          // The "Cancelled" tab should show both rejected and cancelled jobs.
          query.status = { $in: ['cancelled', 'rejected'] };
          break;
        case 'reported':
          // The "Reported" tab for users to see their bookings with open reports.
          // We also check for the existence of a reason to filter out "ghost" reports
          // that might be created with just a default status.
          query['report.status'] = 'open';
          query['report.reason'] = { $exists: true, $ne: null };
          break;
        // No default case needed; if view is unknown, we show all (as if view='all').
      }
    }
    
    // Introduce pagination safely (defaulting to 50 items if not specified)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
      .populate('customer', 'name email phone') // Temporarily populate phone
      .populate({
        path: 'vendor',
        populate: {
          path: 'user',
          select: 'name email phone' // Temporarily populate phone
        }
      })
      .populate('service', 'title category pricing')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Conditionally strip sensitive info based on status for list view
    const canViewContactInfoStatuses = ['confirmed', 'in-progress', 'completed'];
    const results = bookings.map(booking => {
      const bookingObject = booking.toObject();
      const canView = canViewContactInfoStatuses.includes(bookingObject.status);

      if (!canView) {
        if (bookingObject.customer) delete bookingObject.customer.phone;
        if (bookingObject.vendor?.user) delete bookingObject.vendor.user.phone;
      }
      return bookingObject;
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      // Populate all fields initially; we will filter them based on role and status
      .populate('customer', 'name email phone address avatar')
      .populate({
        path: 'vendor',
        populate: {
          path: 'user',
          select: 'name email phone address avatar'
        }
      })
      .populate('service')
      .populate({
        path: 'report.raisedBy',
        model: 'User',
        select: 'name role'
      });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // --- Authorization & Data Privacy Logic ---
    const isCustomer = booking.customer?._id.equals(req.user._id);
    const isVendor = booking.vendor?.user?._id.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isVendor && !isAdmin) {
      return res.status(403).json({ error: 'Access denied. You are not part of this booking.' });
    }

    // Convert to a plain object to safely modify it before sending
    const bookingObject = booking.toObject();

    // Define which statuses allow contact info to be shared
    const canViewContactInfo = ['confirmed', 'in-progress', 'completed'].includes(booking.status);

    // If the user is a VENDOR, hide the CUSTOMER's phone unless appropriate
    if (isVendor && !canViewContactInfo) {
      if (bookingObject.customer) delete bookingObject.customer.phone;
    }

    // If the user is a CUSTOMER, hide the VENDOR's phone unless appropriate
    if (isCustomer && !canViewContactInfo) {
      if (bookingObject.vendor?.user) delete bookingObject.vendor.user.phone;
    }

    // Admins can see everything, so no fields are removed for them.
    res.json(bookingObject);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get OTP for a booking (customer only)
router.get('/:id/otp', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Authorization: Only the customer of this booking can get the OTP.
    if (!booking.customer.equals(req.user._id)) {
      return res.status(403).json({ error: 'Access denied. You are not the customer for this booking.' });
    }

    // OTP is only available when pending verification.
    if (booking.status !== 'verification-pending') {
      return res.status(400).json({ error: 'OTP is only available for bookings pending verification.' });
    }

    // If OTP is expired or doesn't exist, regenerate it.
    if (!booking.completionOtp || !booking.completionOtpExpires || booking.completionOtpExpires < new Date()) {
      booking.completionOtp = Math.floor(100000 + Math.random() * 900000).toString();
      booking.completionOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10-minute expiry
      await booking.save();
      console.log(`🔄 Regenerated OTP for booking ${booking._id}: ${booking.completionOtp}`);
    }

    res.json({ otp: booking.completionOtp });

  } catch (error) {
    console.error(`Error fetching OTP for booking ${req.params.id}:`, error);
    res.status(500).json({ error: 'Server error while fetching OTP.' });
  }
});

// Update booking details (by customer or admin)
router.put('/:id', async (req, res) => {
  try {
    const { scheduledDate, address, notes } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate('vendor', 'user');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Authorization: Only customer or admin can edit.
    const isCustomer = booking.customer.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({ error: 'You are not authorized to edit this booking.' });
    }

    // Logic: Allow edits only on pending or confirmed bookings.
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot edit a booking with status "${booking.status}".` });
    }

    let updateNote = 'Booking details updated';
    if (scheduledDate) {
      booking.scheduledDate = scheduledDate;
      updateNote += ' (Date/Time changed)';
    }
    if (address) {
      booking.address = { ...booking.address, ...address };
      updateNote += ' (Address changed)';
    }
    if (notes) {
      booking.notes.customerNotes = notes;
      updateNote += ' (Notes added/changed)';
    }

    booking.timeline.push({
      status: 'updated',
      note: `${updateNote} by ${req.user.role}.`,
    });

    await booking.save();

    // Notify the other party
    const targetUserId = req.user.role === 'customer' ? booking.vendor?.user : booking.customer;
    if (targetUserId) {
      req.io.to(targetUserId.toString()).emit('booking-details-update', { bookingId: booking._id });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update booking status
router.patch('/:id/status', async (req, res) => {
  try {
    let { status, notes, otp } = req.body;
    const validStatuses = ['pending', 'awaiting-payment', 'confirmed', 'in-progress', 'completed', 'cancelled', 'verification-pending', 'rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status provided: ${status}.` });
    }

    // Find the booking and populate vendor for access checks
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'vendor',
        populate: { path: 'user', select: '_id' },
      });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Authorization: Only the customer, vendor, or an admin can update the status
    const isCustomer = booking.customer?.equals(req.user._id);
    const isVendor = booking.vendor?.user?._id?.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isVendor && !isAdmin) {
      return res.status(403).json({ error: 'Access denied. You cannot update this booking.' });
    }

    // --- OTP Verification Logic ---
    // This must happen before general status updates
    if (status === 'completed' && booking.status === 'verification-pending') {
      if (isVendor) {
        if (!otp) {
          return res.status(400).json({ error: 'OTP is required to complete the booking.' });
        }
        if (booking.completionOtp !== otp) {
          return res.status(400).json({ error: 'Invalid OTP provided.' });
        }
      } else if (!isAdmin) {
        // If it's not the vendor trying to complete, it must be an admin.
        return res.status(403).json({ error: 'Only the vendor or an admin can complete this booking.' });
      }
      booking.completionOtp = undefined; // Clear OTP after use

      // Since the job is complete, mark the payment as ready for vendor payout.
      if (booking.payment) booking.payment.status = 'payout_pending';

    }

    // --- Role-based status transition validation ---
    if (isCustomer) {
      // A customer can only cancel a booking that isn't already finished or cancelled.
      if (status !== 'cancelled') {
        return res.status(403).json({ error: 'As a customer, you can only cancel a booking.' });
      }
      if (['completed', 'cancelled', 'rejected'].includes(booking.status)) {
        return res.status(400).json({ error: `Cannot cancel a booking that is already ${booking.status}.` });
      }
    }

    if (isVendor) {
      // A vendor can manage the lifecycle.
      const allowedVendorStatuses = ['confirmed', 'awaiting-payment', 'rejected', 'in-progress', 'verification-pending', 'cancelled', 'completed'];
      if (!allowedVendorStatuses.includes(status)) {
        return res.status(403).json({ error: `As a vendor, you cannot set the status to '${status}'.` });
      }

      // Intercept 'confirmed': If manual payment hasn't been made yet, force it to 'awaiting-payment'
      if (status === 'confirmed' && booking.payment?.status === 'pending') {
        status = 'awaiting-payment';
      }

      // Prevent vendor from starting a job before the customer has paid
      if (status === 'in-progress' && booking.status !== 'confirmed') {
        return res.status(400).json({ error: 'You can only start the job after the customer payment is verified and confirmed.' });
      }

      // Prevent vendor from starting a new job if they already have one actively running
      if (status === 'in-progress') {
        const activeJob = await Booking.findOne({
          vendor: booking.vendor._id,
          _id: { $ne: booking._id },
          status: { $in: ['in-progress', 'verification-pending'] }
        });
        
        if (activeJob) {
          return res.status(400).json({ error: 'You already have an active job in progress. Please complete it before starting a new one.' });
        }
      }

      // Prevent vendor from completing a job without OTP flow
      if (status === 'completed' && booking.status !== 'verification-pending') {
        return res.status(400).json({ error: 'Cannot complete a booking directly. Please use the OTP verification flow.' });
      }
    }

    let generatedOtp = null;
    // Generate OTP if status is changing to verification-pending
    if (status === 'verification-pending') {
      generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      booking.completionOtp = generatedOtp;
      booking.completionOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes
      
      // Log to console for dev
      console.log('\n================================================================');
      console.log('🔐  OTP GENERATED FOR BOOKING COMPLETION');
      console.log(`🆔  Booking ID: ${booking._id}`);
      console.log(`🔑  CODE:       ${generatedOtp}`);
      console.log('================================================================\n');
    }

    booking.status = status;
    if (notes) {
      if (!booking.notes) booking.notes = {}; // Ensure notes object exists
      if (req.user.role === 'customer') {
        booking.notes.customerNotes = notes;
      } else if (req.user.role === 'vendor') {
        booking.notes.vendorNotes = notes;
      }
    }

    // Add a record of this change to the booking's timeline
    booking.timeline.push({
      status,
      note: notes || `Status updated to ${status} by ${req.user.role}`,
      timestamp: new Date(),
    });

    await booking.save();

    // Send real-time notification to the other party involved in the booking
    const isCustomerUpdating = req.user.role === 'customer';
    const targetUserId = (isCustomerUpdating
      ? booking.vendor?.user?._id
      : booking.customer)?.toString(); // Ensure targetUserId is a string

    if (targetUserId) {
      console.log(`Backend: Attempting to emit booking-status-update to user ID: ${targetUserId}`); // Debug log
      const statusUpdatePayload = {
        bookingId: booking._id.toString(), // Ensure bookingId is a string for frontend comparison
        status,
        updatedBy: req.user.role,
      };

      // If an OTP was generated, send it in the same block to ensure atomicity
      if (status === 'verification-pending' && generatedOtp) {
        // Also send the backup email, populating customer info first
        await booking.populate('customer', 'name email');
        if (booking.customer && booking.customer.email) {
            const recipientEmail = booking.customer.email; // Send to actual customer email
          const customerIdentifier = `${booking.customer.name} (${booking.customer.email})`; // For logging/subject
          const otpMessage = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #2563eb; padding: 20px; text-align: center;">
                <h2 style="color: white; margin: 0;">Your Service Verification Code</h2>
              </div>
              <div style="padding: 20px;">
                <p>Hello <strong>${booking.customer.name}</strong>,</p>
                <p>Your vendor has requested to mark the service as completed. To confirm, please provide them with the following verification code:</p>
                <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                  <h1 style="letter-spacing: 5px; color: #1f2937; margin: 0; font-size: 32px;">${generatedOtp}</h1>
                </div>
                <p style="color: #6b7280; font-size: 14px;">If you did not authorize this, please contact support.</p>
              </div>
            </div>
          `;

          try {
            await sendEmail({ email: recipientEmail, subject: `Service Completion OTP for ${customerIdentifier}`, message: otpMessage });
            console.log(`📧 OTP Email sent to ${recipientEmail}`);
          } catch (error) {
            console.error('❌ Error sending OTP email:', error);
            // We don't throw here because the real-time OTP is the primary method.
          }
        }
      }

      console.log('Backend: Final payload before emitting:', statusUpdatePayload); // Debug log
      // Emit the single, consolidated event
      req.io.to(targetUserId).emit('booking-status-update', statusUpdatePayload);
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Raise a report for a booking
router.post('/:id/dispute', async (req, res) => {
  try {
    const { reason, description } = req.body;
    if (!reason || !description) {
      return res.status(400).json({ error: 'Reason and description are required to report an issue.' });
    }

    const booking = await Booking.findById(req.params.id).populate('vendor', 'user');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Authorization: Only customer or vendor can report an issue.
    const isCustomer = booking.customer.equals(req.user._id);
    const isVendor = booking.vendor?.user?._id.equals(req.user._id);

    if (!isCustomer && !isVendor) {
      return res.status(403).json({ error: 'You are not authorized to report an issue for this booking.' });
    }

    // Logic: Can only report issues for bookings that are in progress, completed, or pending verification.
    const reportableStatuses = ['in-progress', 'verification-pending', 'completed'];
    if (!reportableStatuses.includes(booking.status)) {
      return res.status(400).json({ error: `Cannot report an issue for a booking with status "${booking.status}".` });
    }
    
    if (booking.dispute && booking.dispute.status === 'open') {
        return res.status(400).json({ error: 'An issue has already been reported for this booking and is currently open.' });
    }

    // Add report info and update booking status to 'reported'
    booking.status = 'reported';
    booking.dispute = {
      raisedBy: req.user._id,
      reason,
      description,
      status: 'open',
      createdAt: new Date(),
    };

    booking.timeline.push({
      status: 'reported',
      note: `Dispute raised by ${req.user.role}: "${reason}"`,
    });

    await booking.save();

    // Notify all admins about the new report
    try {
      const admins = await User.find({ role: 'admin' }).select('_id');
      if (admins.length > 0) {
        const adminIds = admins.map(admin => admin._id.toString());
        const notificationPayload = {
          bookingId: booking._id,
          reason: booking.dispute.reason,
          raisedBy: {
            name: req.user.name, // req.user is available from authenticateToken
            role: req.user.role,
          }
        };
        // Emit to each admin's room
        adminIds.forEach(adminId => {
          req.io.to(adminId).emit('new-dispute', notificationPayload);
        });
        console.log(`📢 Notified ${adminIds.length} admin(s) of new report for booking ${booking._id}`);
      }
    } catch (notificationError) {
      console.error("Error sending admin notification for new report:", notificationError);
      // Do not fail the request if notification fails
    }

    // Repopulate to ensure the frontend gets the full object for optimistic updates
    const updatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'name email phone')
      .populate({
        path: 'vendor',
        populate: { path: 'user', select: 'name email phone' }
      })
      .populate('service', 'title category pricing')
      .populate({
        path: 'dispute.raisedBy',
        model: 'User',
        select: 'name role'
      });

    res.status(200).json(updatedBooking);
  } catch (error) {
    console.error("Error reporting issue:", error);
    res.status(500).json({ error: 'Server error while reporting issue.' });
  }
});

// Add rating and review
router.post('/:id/review', async (req, res) => {
  try {
    const { score, review } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Corrected check: Ensure the user is the customer for this booking
    if (!booking.customer.equals(req.user._id)) {
      return res.status(403).json({ error: 'Only the customer who made the booking can leave a review.' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Can only review completed services.' });
    }

    // Prevent submitting more than one review
    if (booking.rating && booking.rating.score) {
      return res.status(400).json({ error: 'A review for this booking has already been submitted.' });
    }

    booking.rating = {
      score,
      review,
      date: new Date()
    };

    await booking.save();

    // After saving the review, recalculate the vendor's average rating
    const vendor = await Vendor.findById(booking.vendor);
    if (vendor) {
      const stats = await Booking.aggregate([
        { $match: { vendor: vendor._id, status: 'completed', 'rating.score': { $exists: true } } },
        { 
          $group: { 
            _id: '$vendor', 
            average: { $avg: '$rating.score' },
            count: { $sum: 1 }
          } 
        }
      ]);

      if (stats.length > 0) {
        await User.findByIdAndUpdate(vendor.user, {
          'ratings.average': stats[0].average,
          'ratings.count': stats[0].count
        });
      }
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add-on: Vendor requests extra charges
router.post('/:id/addons', authenticateToken, authorizeRole(['vendor']), async (req, res) => {
  try {
    const { description, amount } = req.body;
    if (!description || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'A valid description and positive amount are required.' });
    }

    const booking = await Booking.findById(req.params.id).populate('vendor', 'user');
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    // Authorization: Ensure it's the correct vendor
    if (!booking.vendor?.user?.equals(req.user._id)) {
      return res.status(403).json({ error: 'You are not the vendor for this booking.' });
    }

    // Logic: Can only add charges to a job that's in progress
    if (!['confirmed', 'in-progress'].includes(booking.status)) {
      return res.status(400).json({ error: 'Extra charges can only be added to a confirmed or in-progress job.' });
    }

    if (!booking.addOns) booking.addOns = []; // Ensure addOns array exists
    const newAddOn = {
      description,
      amount: parseFloat(amount),
      status: 'pending',
      createdAt: new Date()
    };

    booking.addOns.push(newAddOn);
    
    booking.timeline.push({
      status: booking.status, // Keep current status, but add a note
      note: `Vendor requested extra charge: "${description}" for ₹${amount}. Awaiting customer approval.`,
      timestamp: new Date()
    });

    await booking.save();

    // Notify customer in real-time
    req.io.to(booking.customer.toString()).emit('addon-requested', { 
      bookingId: booking._id, 
      addOn: booking.addOns[booking.addOns.length - 1] // send the newly created addon
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error("Error adding addon:", error);
    res.status(500).json({ error: 'Server error while adding extra charges.' });
  }
});

// Add-on: Customer approves or rejects extra charges
router.patch('/:id/addons/:addOnId', authenticateToken, authorizeRole(['customer']), async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected".' });
    }

    const booking = await Booking.findById(req.params.id).populate({ path: 'vendor', populate: { path: 'user', select: '_id' } });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    if (!booking.customer.equals(req.user._id)) return res.status(403).json({ error: 'You are not the customer for this booking.' });

    const addOn = booking.addOns.id(req.params.addOnId);
    if (!addOn) return res.status(404).json({ error: 'Add-on not found.' });
    if (addOn.status !== 'pending') return res.status(400).json({ error: `This add-on has already been ${addOn.status}.` });

    addOn.status = status;

    if (status === 'approved') {
      const newTotalAmount = booking.price.amount + addOn.amount;
      booking.price.amount = newTotalAmount;
      booking.price.platformFee = newTotalAmount * 0.10; // Recalculate platform fee
      booking.price.vendorPayout = newTotalAmount * 0.90; // Recalculate vendor payout
      booking.status = 'awaiting-payment'; // Customer needs to pay the difference
      if (!booking.payment) booking.payment = {};
      booking.payment.status = 'pending'; // Reset payment status to pending for the add-on
      booking.timeline.push({ status: 'awaiting-payment', note: `Customer approved extra charge for "${addOn.description}" of ₹${addOn.amount}. New total: ₹${newTotalAmount}. Awaiting payment for add-on.`, timestamp: new Date() });
    } else { // 'rejected'
      booking.timeline.push({ status: 'in-progress', note: `Customer rejected extra charge for "${addOn.description}".`, timestamp: new Date() });
    }

    await booking.save();

    if (booking.vendor?.user?._id) req.io.to(booking.vendor.user._id.toString()).emit('addon-status-updated', { bookingId: booking._id, addOnId: addOn._id, status: addOn.status, newPrice: booking.price.amount });
    req.io.to(booking.customer.toString()).emit('booking-status-update', { bookingId: booking._id, status: booking.status });

    res.json(booking);
  } catch (error) {
    console.error("Error responding to addon:", error);
    res.status(500).json({ error: 'Server error while responding to extra charges.' });
  }
});

// NEW: Add-on: Vendor cancels a pending extra charge
router.patch('/:id/addons/:addOnId/cancel', authenticateToken, authorizeRole(['vendor']), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('vendor', 'user');
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    // Authorization: Ensure it's the correct vendor
    if (!booking.vendor?.user?.equals(req.user._id)) {
      return res.status(403).json({ error: 'You are not the vendor for this booking.' });
    }

    const addOn = booking.addOns.id(req.params.addOnId);
    if (!addOn) return res.status(404).json({ error: 'Add-on not found.' });

    // Only a pending add-on can be cancelled by the vendor
    if (addOn.status !== 'pending') {
      return res.status(400).json({ error: `This add-on cannot be cancelled as its status is '${addOn.status}'.` });
    }

    addOn.status = 'cancelled'; // Set status to cancelled

    booking.timeline.push({
      status: 'in-progress', // Booking status remains in-progress
      note: `Vendor cancelled pending extra charge for "${addOn.description}".`,
      timestamp: new Date()
    });

    await booking.save();

    // Notify customer in real-time
    req.io.to(booking.customer.toString()).emit('addon-status-updated', {
      bookingId: booking._id,
      addOnId: addOn._id,
      status: addOn.status,
      newPrice: booking.price.amount // Price remains unchanged
    });

    res.json(booking);
  } catch (error) {
    console.error("Error cancelling add-on:", error);
    res.status(500).json({ error: 'Server error while cancelling extra charge.' });
  }
});

// --- BACKGROUND JOB: AUTO-CANCEL LATE VENDORS ---
// Runs every 15 minutes to find and cancel confirmed jobs where the vendor is >2 hours late.
setInterval(async () => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const overdueBookings = await Booking.find({
      status: 'confirmed', // Only target confirmed jobs that haven't been started yet
      scheduledDate: { $lte: twoHoursAgo }
    }).populate('customer', '_id').populate({ path: 'vendor', populate: { path: 'user', select: '_id' } });

    if (overdueBookings.length > 0) {
      // Dynamic import of io to prevent circular dependencies in router definitions
      const { io } = await import('../index.js');
      
      for (const booking of overdueBookings) {
        booking.status = 'cancelled';
        
        if (!booking.notes) booking.notes = {};
        booking.notes.systemNotes = 'Auto-cancelled: Vendor failed to start the job within 2 hours of scheduled time.';
        
        // Unstick the money! Flag it for the Admin to refund the customer
        if (booking.payment) {
          booking.payment.status = 'refund_pending';
        }
        
        booking.timeline.push({
          status: 'cancelled',
          note: 'Auto-cancelled by system: Vendor was more than 2 hours late. Marked for refund.',
          timestamp: new Date()
        });

        await booking.save();

        // Notify Customer and Vendor
        if (booking.customer?._id && io) io.to(booking.customer._id.toString()).emit('booking-status-update', { bookingId: booking._id.toString(), status: 'cancelled', updatedBy: 'system' });
        if (booking.vendor?.user?._id && io) io.to(booking.vendor.user._id.toString()).emit('booking-status-update', { bookingId: booking._id.toString(), status: 'cancelled', updatedBy: 'system' });
      }
      console.log(`[SYSTEM] Auto-cancelled ${overdueBookings.length} overdue booking(s) and flagged for refund.`);
    }
  } catch (error) {
    console.error('[SYSTEM] Error in overdue bookings cron:', error);
  }
}, 15 * 60 * 1000); // Check every 15 minutes

// --- BACKGROUND JOB: AUTO-CANCEL UNPAID BOOKINGS ---
// Runs every 5 minutes to find and cancel jobs where the customer hasn't paid within 15 minutes of vendor acceptance.
setInterval(async () => {
  try {
    const timeoutLimit = new Date(Date.now() - 15 * 60 * 1000);
    
    const unpaidBookings = await Booking.find({
      status: 'awaiting-payment'
    }).populate('customer', '_id').populate({ path: 'vendor', populate: { path: 'user', select: '_id' } });

    if (unpaidBookings.length > 0) {
      const { io } = await import('../index.js');
      
      for (const booking of unpaidBookings) {
        // Find exactly when the booking entered 'awaiting-payment' status
        const awaitingEvent = booking.timeline.slice().reverse().find(t => t.status === 'awaiting-payment');
        const eventTime = awaitingEvent ? new Date(awaitingEvent.timestamp) : new Date(booking.createdAt);

        // If they have been waiting for more than 15 minutes, auto-cancel
        if (eventTime <= timeoutLimit) {
          booking.status = 'cancelled';
          
          if (!booking.notes) booking.notes = {};
          booking.notes.systemNotes = 'Auto-cancelled: Customer failed to upload payment proof within 15 minutes of vendor acceptance.';
          
          booking.timeline.push({ status: 'cancelled', note: 'Auto-cancelled by system: Payment timeout (15 minutes).', timestamp: new Date() });
          await booking.save();

          if (booking.customer?._id && io) io.to(booking.customer._id.toString()).emit('booking-status-update', { bookingId: booking._id.toString(), status: 'cancelled', updatedBy: 'system' });
          if (booking.vendor?.user?._id && io) io.to(booking.vendor.user._id.toString()).emit('booking-status-update', { bookingId: booking._id.toString(), status: 'cancelled', updatedBy: 'system' });
        }
      }
    }
  } catch (error) {
    console.error('[SYSTEM] Error in unpaid bookings cron:', error);
  }
}, 5 * 60 * 1000); // Check every 5 minutes

export default router;