import express from 'express';
import crypto from 'crypto';
import Booking from '../models/Booking.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { createOrder, verifyPaymentSignature, processRefund, createPayout } from '../utils/razorpay.js';

const router = express.Router();

// ===============================
// Create Razorpay Order (authenticated)
// ===============================
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required.' });
    }

    const booking = await Booking.findById(bookingId).populate('service', 'pricing.amount title');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Only the customer who owns this booking can pay
    if (!booking.customer.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. You are not the customer for this booking.' });
    }

    // Only allow payment when awaiting-payment
    if (booking.status !== 'awaiting-payment') {
      return res.status(400).json({ error: `Cannot pay for a booking with status "${booking.status}".` });
    }

    // Prevent duplicate Razorpay order creation
    if (booking.payment?.razorpayOrderId) {
      return res.status(400).json({ error: 'A payment order has already been created for this booking.' });
    }

    const amount = booking.price?.amount || 0;
    if (amount <= 0) {
      return res.status(400).json({ error: 'Invalid booking amount.' });
    }

    const order = await createOrder({
      amount,
      receipt: `booking_${booking._id}`,
      notes: {
        bookingId: booking._id.toString(),
        customerId: req.user._id.toString(),
        serviceTitle: booking.service?.title || '',
      },
    });

    // Save Razorpay order ID to booking
    booking.payment = booking.payment || {};
    booking.payment.method = 'razorpay';
    booking.payment.razorpayOrderId = order.id;
    await booking.save();

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create payment order.' });
  }
});

// ===============================
// Verify Payment (client-side fallback)
// ===============================
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { bookingId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!bookingId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing required payment verification fields.' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Idempotency check: already confirmed
    if (booking.status === 'confirmed') {
      return res.json({ success: true, message: 'Payment already verified.' });
    }

    // Verify signature
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature.' });
    }

    // Update booking
    booking.payment = {
      ...booking.payment?.toObject?.() || booking.payment || {},
      method: 'razorpay',
      status: 'paid_to_platform',
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      paidAt: new Date(),
    };
    booking.status = 'confirmed';

    booking.timeline.push({
      status: 'confirmed',
      note: 'Payment verified via Razorpay.',
      timestamp: new Date(),
    });

    await booking.save();

    // Notify vendor
    if (booking.vendor?.user?._id) {
      req.io.to(booking.vendor.user._id.toString()).emit('booking-status-update', {
        bookingId: booking._id.toString(),
        status: 'confirmed',
        updatedBy: 'system',
      });
    }

    res.json({ success: true, booking });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Payment verification failed.' });
  }
});

// ===============================
// Razorpay Webhook (no auth — signature verified)
// ===============================
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body; // Raw Buffer from express.raw()

    if (!signature || !body) {
      return res.status(400).json({ error: 'Missing signature or body.' });
    }

    const bodyString = body.toString();

    // Verify webhook signature using the raw body string
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(bodyString)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const event = JSON.parse(bodyString);

    const payment = event.payload.payment?.entity;
    const razorpayOrderId = payment?.order_id;
    const razorpayPaymentId = payment?.id;

    if (!razorpayOrderId) {
      return res.json({ status: 'ignored', reason: 'No order_id in event payload.' });
    }

    const booking = await Booking.findOne({ 'payment.razorpayOrderId': razorpayOrderId });
    if (!booking) {
      console.error(`Webhook: No booking found for order ${razorpayOrderId}`);
      return res.status(404).json({ error: 'Booking not found.' });
    }

    switch (event.event) {
      case 'payment.captured': {
        if (booking.status === 'confirmed') {
          return res.json({ status: 'already_processed' });
        }
        booking.payment = {
          ...booking.payment?.toObject?.() || booking.payment || {},
          method: 'razorpay',
          status: 'paid_to_platform',
          razorpayPaymentId,
          paidAt: new Date(),
        };
        booking.status = 'confirmed';
        booking.timeline.push({
          status: 'confirmed',
          note: 'Payment confirmed via Razorpay webhook.',
          timestamp: new Date(),
        });
        await booking.save();
        if (booking.vendor?.user?._id) {
          req.io.to(booking.vendor.user._id.toString()).emit('booking-status-update', {
            bookingId: booking._id.toString(),
            status: 'confirmed',
            updatedBy: 'system',
          });
        }
        console.log(`Webhook: Booking ${booking._id} confirmed via payment ${razorpayPaymentId}`);
        return res.json({ status: 'processed', event: 'payment.captured' });
      }

      case 'payment.failed': {
        if (booking.status === 'awaiting-payment') {
          booking.timeline.push({
            status: 'awaiting-payment',
            note: 'Payment attempt failed. You can retry.',
            timestamp: new Date(),
          });
          await booking.save();
          console.log(`Webhook: Payment failed for booking ${booking._id}, order ${razorpayOrderId}`);
        }
        return res.json({ status: 'processed', event: 'payment.failed' });
      }

      case 'refund.created': {
        if (booking.payment?.status === 'refunded') {
          return res.json({ status: 'already_processed' });
        }
        booking.payment = {
          ...booking.payment?.toObject?.() || booking.payment || {},
          status: 'refunded',
        };
        booking.timeline.push({
          status: booking.status,
          note: `Refund initiated via Razorpay. Refund ID: ${payment?.id || 'N/A'}`,
          timestamp: new Date(),
        });
        await booking.save();
        console.log(`Webhook: Refund created for booking ${booking._id}, payment ${razorpayPaymentId}`);
        return res.json({ status: 'processed', event: 'refund.created' });
      }

      default:
        return res.json({ status: 'ignored', event: event.event });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

// ===============================
// Process Refund (admin only)
// ===============================
router.post('/refund', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    if (booking.payment?.method !== 'razorpay' || !booking.payment?.razorpayPaymentId) {
      return res.status(400).json({ error: 'No Razorpay payment found to refund.' });
    }

    const refund = await processRefund(booking.payment.razorpayPaymentId, booking.price?.amount || 0);

    booking.payment.status = 'refunded';
    booking.status = 'cancelled';
    booking.timeline.push({
      status: 'cancelled',
      note: `Refund processed via Razorpay. Refund ID: ${refund.id}`,
      timestamp: new Date(),
    });
    await booking.save();

    res.json({ success: true, refund });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Refund processing failed.' });
  }
});

// ===============================
// Vendor Payout (admin only)
// ===============================
router.post('/vendor-payout', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { bookingId, accountNumber, ifsc, vendorName } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    if (booking.payment?.status !== 'payout_pending') {
      return res.status(400).json({ error: 'Payout is not pending for this booking.' });
    }

    const payoutAmount = booking.price?.vendorPayout || 0;
    if (payoutAmount <= 0) {
      return res.status(400).json({ error: 'Invalid payout amount.' });
    }

    const payout = await createPayout({
      accountNumber,
      ifsc,
      name: vendorName,
      amount: payoutAmount,
    });

    booking.payment.status = 'paid_to_vendor';
    booking.payment.payoutId = payout.id;
    booking.payment.payoutAt = new Date();
    booking.timeline.push({
      status: booking.status,
      note: `Vendor payout processed. Payout ID: ${payout.id}`,
      timestamp: new Date(),
    });
    await booking.save();

    res.json({ success: true, payout });
  } catch (error) {
    console.error('Payout error:', error);
    res.status(500).json({ error: 'Payout processing failed.' });
  }
});

export default router;
