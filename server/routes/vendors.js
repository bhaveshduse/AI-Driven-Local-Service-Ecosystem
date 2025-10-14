import express from 'express';
import Vendor from '../models/Vendor.js';
import Service from '../models/Service.js';
import Booking from '../models/Booking.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

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
// Create/Update Vendor Profile
// ===============================
router.post(
  '/profile',
  authenticateToken,
  authorizeRole(['vendor']),
  async (req, res) => {
    try {
      const updateData = {
        businessName: req.body.businessName,
        serviceCategories: req.body.serviceCategories || [],
        description: req.body.description || '',
        serviceArea: req.body.serviceArea || { radius: 10, cities: [] },
        experience: req.body.experience || 0,
      };

      // Update if exists, otherwise error
      const vendor = await Vendor.findOneAndUpdate(
        { user: req.user._id },
        updateData,
        { new: true, runValidators: true }
      );

      if (!vendor) return res.status(404).json({ error: 'Vendor profile not found.' });

      res.json(vendor);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

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
  async (req, res) => {
    try {
      const vendor = await Vendor.findOneAndUpdate(
        { user: req.user._id },
        req.body,
        { new: true }
      ).populate('user', '-password');

      if (!vendor) return res.status(404).json({ error: 'Vendor profile not found.' });
      res.json(vendor);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ===============================
// Admin: Verify Vendor & Create Default Services
// ===============================
router.post(
  '/verify/:id',
  authenticateToken,
  authorizeRole(['admin']),
  async (req, res) => {
    try {
      const vendor = await Vendor.findById(req.params.id);
      if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

      vendor.verificationStatus = 'verified';
      vendor.verifiedBy = req.user._id;
      vendor.verificationDate = new Date();
      await vendor.save();

      // Hybrid approach: create default services if none exist
      const existingServices = await Service.find({ vendor: vendor._id });
      if (existingServices.length === 0) {
        const defaultServices = vendor.serviceCategories.map(cat => ({
          title: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Service`,
          description: `Professional ${cat.replace('-', ' ')} service by ${vendor.businessName}`,
          category: cat,
          pricing: { type: 'fixed', amount: 500, unit: 'per job' },
          images: [],
          vendor: vendor._id,
          isActive: true,
        }));
        await Service.insertMany(defaultServices);
      }

      res.json({ message: 'Vendor verified & default services created.', vendor });
    } catch (err) {
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
      const { status, vendorNotes } = req.body;
      const allowedStatuses = ['pending', 'accepted', 'rejected', 'completed'];
      if (!allowedStatuses.includes(status))
        return res.status(400).json({ error: 'Invalid status' });

      const booking = await Booking.findById(req.params.bookingId);
      if (!booking) return res.status(404).json({ error: 'Booking not found.' });

      booking.status = status;
      booking.notes = booking.notes || {};
      if (vendorNotes) booking.notes.vendorNotes = vendorNotes;

      booking.timeline.push({
        status,
        note: vendorNotes || `Status updated to ${status}`,
      });

      await booking.save();
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
        status: 'completed',
        'pricing.paymentStatus': 'paid',
      });

      const total = bookings.reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);
      const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const thisMonth = bookings
        .filter(b => b.createdAt >= thisMonthStart)
        .reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);

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

export default router;
