import express from 'express';
import Vendor from '../models/Vendor.js';
import Service from '../models/Service.js';
import Booking from '../models/Booking.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();
// ===============================
// Create vendor profile
// ===============================
router.post(
  '/profile',
  authenticateToken,
  authorizeRole(['vendor']),
  async (req, res) => {
    try {
      // check if vendor profile already exists
      const existing = await Vendor.findOne({ user: req.user._id });
      if (existing) {
        return res.status(400).json({ error: 'Vendor profile already exists' });
      }

      const vendor = new Vendor({
        user: req.user._id,
        businessName: req.body.businessName,
        serviceCategories: req.body.serviceCategories || [],
        description: req.body.description || '',
        serviceArea: req.body.serviceArea || { radius: 10, cities: [] },
        experience: req.body.experience || 0,
      });

      await vendor.save();

      res.status(201).json(vendor);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
// ===============================
// Get vendor profile
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

      if (!vendor) {
        return res.status(404).json({ error: 'Vendor profile not found' });
      }

      res.json(vendor);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ===============================
// Update vendor profile
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

      if (!vendor) {
        return res.status(404).json({ error: 'Vendor profile not found' });
      }

      res.json(vendor);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ===============================
// Get vendor bookings
// ===============================
router.get(
  '/bookings',
  authenticateToken,
  authorizeRole(['vendor']),
  async (req, res) => {
    try {
      const vendor = await Vendor.findOne({ user: req.user._id });
      const bookings = await Booking.find({ vendor: vendor._id })
        .populate('customer', 'name email phone')
        .populate('service', 'title category')
        .sort({ createdAt: -1 });

      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ===============================
// Update booking status
// ===============================
router.patch(
  '/bookings/:bookingId/status',
  authenticateToken,
  authorizeRole(['vendor']),
  async (req, res) => {
    try {
      const { status, vendorNotes } = req.body;
      const allowedStatuses = ['pending', 'accepted', 'rejected', 'completed'];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status update' });
      }

      const booking = await Booking.findById(req.params.bookingId);

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      booking.status = status;

      // ensure notes object exists
      if (!booking.notes) booking.notes = {};
      if (vendorNotes) booking.notes.vendorNotes = vendorNotes;

      booking.timeline.push({
        status,
        note: vendorNotes || `Status updated to ${status}`,
      });

      await booking.save();

      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ===============================
// Get vendor earnings
// ===============================
router.get(
  '/earnings',
  authenticateToken,
  authorizeRole(['vendor']),
  async (req, res) => {
    try {
      const vendor = await Vendor.findOne({ user: req.user._id });
      const bookings = await Booking.find({
        vendor: vendor._id,
        status: 'completed',
        'pricing.paymentStatus': 'paid',
      });

      const totalEarnings = bookings.reduce(
        (sum, booking) => sum + (booking.pricing?.totalAmount || 0),
        0
      );

      const thisMonthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );

      const thisMonthEarnings = bookings
        .filter((booking) => booking.createdAt >= thisMonthStart)
        .reduce((sum, booking) => sum + (booking.pricing?.totalAmount || 0), 0);

      res.json({
        total: totalEarnings,
        thisMonth: thisMonthEarnings,
        completedJobs: bookings.length,
        bookings: bookings.slice(0, 10), // recent 10 bookings
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
