import express from 'express';
import Booking from '../models/Booking.js';
import { io } from '../index.js';

const router = express.Router();

// Create booking
router.post('/', async (req, res) => {
  try {
    const booking = new Booking({
      customer: req.user._id,
      ...req.body
    });

    await booking.save();

    // Populate for response
    await booking.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'vendor', populate: { path: 'user', select: 'name email phone' } },
      { path: 'service', select: 'title category pricing' }
    ]);

    // Send real-time notification to vendor
    io.to(booking.vendor.user._id.toString()).emit('new-booking', {
      bookingId: booking._id,
      customer: booking.customer,
      service: booking.service,
      scheduledDate: booking.scheduledDate
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's bookings
router.get('/', async (req, res) => {
  try {
    const query = req.user.role === 'customer' 
      ? { customer: req.user._id }
      : { vendor: req.user._id };

    const bookings = await Booking.find(query)
      .populate('customer', 'name email phone')
      .populate({
        path: 'vendor',
        populate: {
          path: 'user',
          select: 'name email phone'
        }
      })
      .populate('service', 'title category pricing')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email phone address')
      .populate({
        path: 'vendor',
        populate: {
          path: 'user',
          select: 'name email phone address'
        }
      })
      .populate('service');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user has access to this booking
    const hasAccess = booking.customer._id.equals(req.user._id) || 
                     booking.vendor.user._id.equals(req.user._id) ||
                     req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update booking status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    booking.status = status;
    if (notes) {
      if (req.user.role === 'customer') {
        booking.notes.customerNotes = notes;
      } else if (req.user.role === 'vendor') {
        booking.notes.vendorNotes = notes;
      }
    }

    booking.timeline.push({
      status,
      note: notes || `Status updated to ${status}`
    });

    await booking.save();

    // Send real-time notification
    const targetUserId = req.user.role === 'customer' 
      ? booking.vendor.user._id 
      : booking.customer._id;

    io.to(targetUserId.toString()).emit('booking-status-update', {
      bookingId: booking._id,
      status,
      updatedBy: req.user.role
    });

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    if (!booking.customer._id.equals(req.user._id)) {
      return res.status(403).json({ error: 'Only customers can leave reviews' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Can only review completed services' });
    }

    booking.rating = {
      score,
      review,
      date: new Date()
    };

    await booking.save();

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;