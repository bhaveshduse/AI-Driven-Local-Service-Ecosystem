import express from 'express';
// Import controller functions from the userController file
import { getUsers, updateUser, deleteUser } from '../userController.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Booking from '../models/Booking.js';
import { authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// ===============================
// Analytics (Unchanged)
// ===============================
router.get('/analytics', authorizeRole(['admin']), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalVendors = await Vendor.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    
    const totalRevenue = await Booking.aggregate([
      { $match: { status: 'completed', 'pricing.paymentStatus': 'paid' } },
      { $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } }
    ]);

    const monthlyBookings = await Booking.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.json({
      totalUsers,
      totalVendors,
      totalBookings,
      completedBookings,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyBookings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// User Management Routes (Delegated to userController.js)
// ===============================

// @route GET /api/admin/users
// @desc Get a list of all users with search and pagination (Uses Controller)
router.get('/users', authorizeRole(['admin']), getUsers);

// @route GET /api/admin/users/:id
// @desc Get single user detail (Kept inline as simple lookup)
router.get('/users/:id', authorizeRole(['admin']), async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route PUT /api/admin/users/:id
// @desc Update user role and active status (Uses Controller, replaces old PATCH /status)
router.put('/users/:id', authorizeRole(['admin']), updateUser);

// @route DELETE /api/admin/users/:id
// @desc Delete a user (Uses Controller)
router.delete('/users/:id', authorizeRole(['admin']), deleteUser);

/* * NOTE: The old 'router.patch('/users/:id/status', ...)' route has been removed 
 * for consolidation. The new PUT /users/:id (updateUser in the controller) 
 * now handles isActive and role updates in a single request. 
 * If you still need to update 'isVerified', you must implement that logic 
 * within the updateUser function or create a new dedicated PATCH route for it.
*/

// ===============================
// Get all vendors (Unchanged)
// ===============================
router.get('/vendors', authorizeRole(['admin']), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let query = {};
    
    if (status && status !== 'all') {
      query.verificationStatus = status;
    }

    const vendors = await Vendor.find(query)
      .populate('user', 'name email phone createdAt isActive isVerified')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Vendor.countDocuments(query);

    res.json({
      vendors,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// ===============================
// Update vendor verification status (FIXED & DEBUGGED FOR USER SYNC)
// ===============================
router.patch('/vendors/:id/verify', authorizeRole(['admin']), async (req, res) => {
  try {
    // If you are sending {"isVerified": true} from Postman, 
    // you must extract 'isVerified' and derive 'verificationStatus'.
    // If you are sending {"verificationStatus": "verified"}, the existing logic is fine.
    
    // Assuming the front-end sends 'isVerified' for simplicity, let's map it:
    const { isVerified, adminNotes } = req.body; 
    let verificationStatus = req.body.verificationStatus;

    if (typeof isVerified === 'boolean') {
        verificationStatus = isVerified ? 'verified' : 'rejected';
    } else if (!verificationStatus) {
        return res.status(400).json({ error: 'Missing status. Must provide verificationStatus (string) or isVerified (boolean).' });
    }
    
    // 1. Update the Vendor profile
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { 
          verificationStatus, 
          adminNotes,
          verifiedBy: verificationStatus === 'verified' ? req.user._id : null,
          verificationDate: verificationStatus === 'verified' ? new Date() : null,
      },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Ensure the user reference is populated to get the ID for synchronization
    await vendor.populate('user');

    // 💡 NULL CHECK: Prevent crash if linked User is missing
    if (!vendor.user) {
        console.error(`--- CRITICAL ERROR: Vendor ${vendor._id} has no linked User document (${vendor.user}). Synchronization failed.`);
        return res.status(500).json({ 
            error: 'Vendor verification status updated, but linked user account is missing (Data Integrity Failure).',
            vendor 
        });
    }

    // 2. Synchronize the linked User account status
    const finalIsVerified = verificationStatus === 'verified';
    const isActive = finalIsVerified; 

    // 💡 DEBUGGING: Log the User ID and the Update Object
    console.log(`\n--- DEBUG SYNC START ---`);
    console.log(`Target User ID: ${vendor.user._id}`);
    console.log(`Update Data: { isVerified: ${finalIsVerified}, isActive: ${isActive} }`);
    
    const updatedUser = await User.findByIdAndUpdate(
        vendor.user._id, 
        { isVerified: finalIsVerified, isActive }, // Use finalIsVerified here
        { new: true }
    );
    
    // 💡 DEBUGGING: Log the result
    if (updatedUser) {
        console.log(`SYNC SUCCESS: User ${updatedUser._id} updated. isVerified: ${updatedUser.isVerified}`);
    } else {
        // This is the source of the silent failure! findByIdAndUpdate returned null, meaning the ID was not found.
        console.error(`SYNC FAILURE: User ID ${vendor.user._id} NOT FOUND by findByIdAndUpdate. User update failed.`);
    }
    console.log(`--- DEBUG SYNC END ---\n`);

    // Repopulate vendor with updated user data for response
    vendor.user = updatedUser;

    res.json(vendor);
  } catch (error) {
    console.error('Error during vendor verification:', error);
    res.status(500).json({ error: error.message });
  }
});
// ===============================
// Get all bookings (Unchanged)
// ===============================
router.get('/bookings', authorizeRole(['admin']), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('customer', 'name email phone')
      .populate({
        path: 'vendor',
        populate: {
          path: 'user',
          select: 'name email phone'
        }
      })
      .populate('service', 'title category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    res.json({
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
