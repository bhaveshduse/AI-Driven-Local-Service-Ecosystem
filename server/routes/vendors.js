import express from 'express';
import Vendor from '../models/Vendor.js';
import Service from '../models/Service.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { geocodeAddress } from '../utils/geocoder.js'; // ✨ Import the reusable geocoder
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'vendor-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Default image for services if a category-specific one isn't found
const PLACEHOLDER_IMAGE_URL = 'https://placehold.co/600x400?text=Service+Image';
const DEFAULT_IMAGE = [PLACEHOLDER_IMAGE_URL];

// ===============================
// Middleware: Check Vendor Verification
// ===============================
const checkVendorVerification = async (req, res, next) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) return res.status(404).json({ error: 'Vendor profile not found.' });

    if (vendor.verificationStatus !== 'verified') {
      return res.status(403).json({ 
        error: `Access Forbidden. Vendor not verified (Status: ${vendor.verificationStatus})`,
        status: vendor.verificationStatus
      });
    }

    req.vendor = vendor;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Verification check failed.' });
  }
};

// ===============================
// Get Vendor Profile
// ===============================
router.get(
  '/profile',
  authenticateToken,
  authorizeRole(['vendor']),
  async (req, res) => {
    try {
      const vendor = await Vendor.findOne({ user: req.user._id })
        .populate('user', '-password')
        .populate('services');

      if (!vendor) return res.status(404).json({ error: 'Vendor profile not found.' });
      res.json(vendor);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ===============================
// Update Vendor Profile
// ===============================
router.put(
  '/profile',
  authenticateToken,
  authorizeRole(['vendor']),
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'identityProof', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      // --- 0. Find the existing vendor to check their current status ---
      const vendorToUpdate = await Vendor.findOne({ user: req.user._id });
      if (!vendorToUpdate) {
        return res.status(404).json({ error: 'Vendor profile not found.' });
      }

      const {
        businessName,
        experience,
        primaryCategory,
        serviceCategories,
        suggestedCategory,
        description,
        cities,
        radius,
        // Add fields for the User model update
        city,
        street,
        state,
        zipCode
      } = req.body;

      // --- 1. Update Linked User Document ---
      const userUpdateData = {};
      if (req.files && req.files['profilePhoto']) {
        userUpdateData.avatar = req.files['profilePhoto'][0].path.replace(/\\/g, '/');
      }
      
      // The user's primary city is now a separate field.
      if (city) {
        userUpdateData.city = city;
      }

      // Consolidate service radius onto the User model for consistency
      if (radius) {
        userUpdateData.serviceRadiusKm = Number(radius);
      }

      // --- NEW: Geocode address and prepare for update ---
      const addressForGeocoding = [street, city, state, zipCode].filter(Boolean).join(', ');
      if (addressForGeocoding) {
        console.log(`[Geocoding] Attempting to geocode address: "${addressForGeocoding}"`);
        let coordinates = await geocodeAddress(addressForGeocoding);

        // If the full address fails, try a simpler version as a fallback.
        if (!coordinates) {
          const simplerAddress = [city, state, zipCode].filter(Boolean).join(', ');
          if (simplerAddress && simplerAddress !== addressForGeocoding) {
            console.warn(`[Geocoding] Full address failed. Retrying with simpler address: "${simplerAddress}"`);
            coordinates = await geocodeAddress(simplerAddress);
          }
        }

        if (coordinates) {
          // The geocoder returns [lon, lat]
          userUpdateData['address.coordinates'] = coordinates;
          console.log(`[Geocoding] Success. Found coordinates: [${coordinates[0]}, ${coordinates[1]}]`);
        } else {
          console.warn(`[Geocoding] All geocoding attempts failed for address: "${addressForGeocoding}"`);
          // To prevent accidentally wiping out existing coordinates if an address update fails geocoding,
          // we can choose to not set the field at all. Or set it to null if that's the desired behavior.
          // For now, we'll just log and not update coordinates.
        }
      }

      // Update other address fields if provided, using dot notation
      if (street) userUpdateData['address.street'] = street;
      if (state) userUpdateData['address.state'] = state;
      if (zipCode) userUpdateData['address.zipCode'] = zipCode;

      if (Object.keys(userUpdateData).length > 0) {
        await User.findByIdAndUpdate(req.user._id, { $set: userUpdateData });
      }

      // --- 2. Prepare Vendor Document Update ---      
      const parsedServiceCategories = serviceCategories ? JSON.parse(serviceCategories) : [];

      // Ensure primary category is included in the main list for easier searching.
      if (primaryCategory && !parsedServiceCategories.includes(primaryCategory)) {
        parsedServiceCategories.push(primaryCategory);
      }

      const vendorUpdateData = {
        businessName,
        experience: Number(experience) || 0,
        description,
        primaryCategory,
        // The list of categories now includes the primary one plus any additional ones.
        serviceCategories: parsedServiceCategories,
        suggestedCategory: suggestedCategory || '',
        'serviceArea.cities': cities ? JSON.parse(cities) : [],
      };

      // --- 3. Handle Verification Document Upload and Status Change ---
      if (req.files && req.files['identityProof']) {
        vendorUpdateData['documents.identityProof'] = req.files['identityProof'][0].path.replace(/\\/g, '/');
        
        // If vendor is submitting/re-submitting documents, move them to 'pending' status.
        // This allows re-submission if they were previously 'rejected'.
        if (['not-submitted', 'rejected'].includes(vendorToUpdate.verificationStatus)) {
          vendorUpdateData.verificationStatus = 'pending';
        }
      }

      const vendor = await Vendor.findOneAndUpdate(
        { user: req.user._id },
        { $set: vendorUpdateData },
        { new: true }
      ).populate('user', '-password');

      if (!vendor) return res.status(404).json({ error: 'Vendor profile not found.' });
      res.json(vendor);
    } catch (err) {
      console.error("Error updating vendor profile:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ===============================
// Get Services for a specific Vendor
// ===============================
router.get(
  '/services',
  authenticateToken,
  authorizeRole(['vendor']),
  async (req, res) => {
    try {
      const vendor = await Vendor.findOne({ user: req.user._id });
      if (!vendor) {
        return res.status(404).json({ error: 'Vendor profile not found.' });
      }

      // Use an aggregation pipeline to dynamically add a reliable displayImage.
      // This solves the issue of showing stale default images and simplifies the frontend.
      const services = await Service.aggregate([
        { $match: { vendor: vendor._id } },
        {
          $addFields: {
            displayImage: {
              $ifNull: [
                { $arrayElemAt: ['$images', 0] }, // 1. Vendor's first uploaded image
                'https://placehold.co/600x400?text=Service+Image' // 3. Global placeholder
              ]
            }
          }
        },
        { $sort: { createdAt: -1 } }
      ]);

      res.json(services);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ===============================
// Admin: Verify Vendor & Auto-Create Default Services
// ===============================
router.post(
  '/verify/:id',
  authenticateToken,
  authorizeRole(['admin']),
  async (req, res) => {
    try {
      const vendor = await Vendor.findById(req.params.id);
      if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

      // 1️⃣ Update vendor verification
      vendor.verificationStatus = 'verified';
      vendor.verifiedBy = req.user._id;
      vendor.verificationDate = new Date();
      await vendor.save();

      // 2️⃣ Check and create default services if not present
      const existingServices = await Service.find({ vendor: vendor._id });

      let insertedServices = [];
      if (existingServices.length === 0 && vendor.serviceCategories?.length > 0) {
        // Fetch category images from the database to ensure they are up-to-date
        const categories = await Category.find({ slug: { $in: vendor.serviceCategories } });
        const categoryMap = categories.reduce((acc, c) => ({ ...acc, [c.slug]: c.image }), {});

        const defaultServices = vendor.serviceCategories.map(cat => ({
          title: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Service`,
          description: `Professional ${cat.replace('-', ' ')} service by ${vendor.businessName}`,
          category: cat,
          pricing: { type: 'fixed', amount: 500, unit: 'per job' },
          // Use the image from the database, or a fallback if not found
          images: categoryMap[cat] ? [categoryMap[cat]] : DEFAULT_IMAGE,
          vendor: vendor._id,
          isActive: true,
        }));

        insertedServices = await Service.insertMany(defaultServices);
        vendor.services = insertedServices.map(s => s._id);
        await vendor.save();

        console.log(`✅ Added ${insertedServices.length} default services for vendor: ${vendor.businessName}`);
      }

      // 3️⃣ Emit real-time event via Socket.IO (auto-update frontend)
      if (insertedServices.length > 0) {
        // The frontend expects populated vendor data to render the service card correctly.
        // We need to re-fetch the newly created services to populate them.
        const serviceIds = insertedServices.map(s => s._id);
        const populatedServices = await Service.find({ _id: { $in: serviceIds } })
          .populate({
            path: 'vendor',
            select: 'businessName verificationStatus user',
            populate: {
              path: 'user',
              select: 'name ratings'
            }
          });
        const { io } = await import('../index.js');
        io.emit('serviceUpdated', { vendorId: vendor._id, services: populatedServices });
      }

      // 4️⃣ Respond back
      res.json({
        message: 'Vendor verified successfully and services created (if none existed).',
        vendor,
        newServices: insertedServices
      });
    } catch (err) {
      console.error('Verification Error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);



// ===============================
// Get Vendor Bookings
// ===============================
router.get(
  '/bookings',
  authenticateToken,
  authorizeRole(['vendor']),
  checkVendorVerification,
  async (req, res) => {
    try {
      const bookings = await Booking.find({ vendor: req.vendor._id })
        .populate('customer', 'name email phone')
        .populate('service', 'title category')
        .sort({ createdAt: -1 });

      res.json(bookings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ===============================
// Update Booking Status
// ===============================
router.patch(
  '/bookings/:bookingId/status',
  authenticateToken,
  authorizeRole(['vendor']),
  checkVendorVerification,
  async (req, res) => {
    try {
      let { status, vendorNotes } = req.body;
      // Corrected allowed statuses to match the Booking model enum.
      // A vendor can confirm, start, request completion (verification-pending), or cancel a booking.
      const allowedVendorStatuses = ['confirmed', 'awaiting-payment', 'in-progress', 'verification-pending', 'cancelled'];
      if (!allowedVendorStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status update. Allowed statuses are: ${allowedVendorStatuses.join(', ')}.` });
      }

      const booking = await Booking.findById(req.params.bookingId);
      if (!booking) return res.status(404).json({ error: 'Booking not found.' });

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
          vendor: req.vendor._id,
          _id: { $ne: booking._id },
          status: { $in: ['in-progress', 'verification-pending'] }
        });
        
        if (activeJob) {
          return res.status(400).json({ error: 'You already have an active job in progress. Please complete it before starting a new one.' });
        }
      }

      booking.status = status;
      booking.notes = booking.notes || {};
      if (vendorNotes) booking.notes.vendorNotes = vendorNotes;

      booking.timeline.push({
        status,
        note: vendorNotes || `Status updated to ${status}`,
      });

      await booking.save();

      // Send real-time notification to the customer so their UI updates instantly
      if (booking.customer) {
        req.io.to(booking.customer.toString()).emit('booking-status-update', {
          bookingId: booking._id.toString(),
          status,
          updatedBy: 'vendor'
        });
      }

      res.json(booking);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ===============================
// Get Vendor Earnings
// ===============================
router.get(
  '/earnings',
  authenticateToken,
  authorizeRole(['vendor']),
  checkVendorVerification,
  async (req, res) => {
    try {
      const bookings = await Booking.find({
        vendor: req.vendor._id,
        status: 'completed'
      });

      const total = bookings.reduce((sum, b) => sum + (b.price?.vendorPayout || (b.price?.amount * 0.90) || 0), 0);
      const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const thisMonth = bookings
        .filter(b => b.createdAt >= thisMonthStart)
        .reduce((sum, b) => sum + (b.price?.vendorPayout || (b.price?.amount * 0.90) || 0), 0);

      res.json({
        total,
        thisMonth,
        completedJobs: bookings.length,
        bookings: bookings.slice(0, 10),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ===============================
// Get Vendor Dashboard Stats
// ===============================
router.get(
  '/dashboard-stats',
  authenticateToken,
  authorizeRole(['vendor']),
  // REMOVED: checkVendorVerification to allow unverified vendors to see their dashboard status
  async (req, res) => {
    try {
      const vendor = await Vendor.findOne({ user: req.user._id });
      if (!vendor) {
        return res.status(404).json({ error: 'Vendor profile not found.' });
      }

      let stats = { activeBookings: 0, completedServices: 0, totalRevenue: 0, avgRating: 0 };
      let recentBookings = [];
      let recentReviews = [];

      if (vendor.verificationStatus === 'verified') {
        const vendorId = vendor._id;

        // 1. Active Bookings
        const activeBookings = await Booking.countDocuments({
          vendor: vendorId,
          status: { $in: ['pending', 'confirmed', 'in-progress', 'verification-pending'] }
        });

        // 2. Completed Services
        const completedServices = await Booking.countDocuments({
          vendor: vendorId,
          status: 'completed'
        });

        // 3. Total Revenue
        const revenueResult = await Booking.aggregate([
          { $match: { vendor: vendorId, status: 'completed' } },
          { $group: { _id: null, total: { $sum: { $ifNull: ['$price.vendorPayout', { $multiply: ['$price.amount', 0.90] }] } } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        // 4. Average Rating
        const ratingResult = await Booking.aggregate([
          { $match: { vendor: vendorId, 'rating.score': { $exists: true } } },
          { $group: { _id: null, avg: { $avg: '$rating.score' } } }
        ]);
        const avgRating = ratingResult.length > 0 ? ratingResult[0].avg : 0;

        stats = { activeBookings, completedServices, totalRevenue, avgRating };

        // 5. Recent Bookings
        recentBookings = await Booking.find({ vendor: vendorId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('customer', 'name')
          .populate('service', 'title');

        // 6. Recent Reviews
        recentReviews = await Booking.find({
          vendor: vendorId,
          status: 'completed',
          'rating.review': { $exists: true, $ne: '' } // Find reviews with non-empty text
        })
        .sort({ 'rating.date': -1 })
        .limit(5)
        .populate('customer', 'name')
        .select('rating customer');
      }

      res.json({
        stats,
        recentBookings,
        recentReviews,
        vendor: {
          verificationStatus: vendor.verificationStatus,
          adminNotes: vendor.adminNotes,
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
