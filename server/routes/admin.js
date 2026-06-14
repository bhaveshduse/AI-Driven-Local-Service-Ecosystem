import express from 'express';
// Import controller functions from the userController file
import { getUsers, updateUser, deleteUser } from '../utils/userController.js';
import User from '../models/User.js';
import Service from '../models/Service.js';
import Vendor from '../models/Vendor.js';
import Category from '../models/Category.js';
import Booking from '../models/Booking.js';
import { authorizeRole } from '../middleware/auth.js';
import multer from 'multer';

const router = express.Router();

const upload = multer();

// Default images for services
const PLACEHOLDER_IMAGE_URL = 'https://placehold.co/600x400?text=Service+Image';
const DEFAULT_IMAGE = [PLACEHOLDER_IMAGE_URL];

// ===============================
// Analytics (Unchanged)
// ===============================
router.get('/analytics', authorizeRole(['admin']), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalVendors = await Vendor.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    
    const financialData = await Booking.aggregate([
      { $match: { 'payment.status': { $in: ['paid_to_platform', 'payout_pending', 'paid_to_vendor'] } } },
      { $group: { 
          _id: null, 
          grossVolume: { $sum: '$price.amount' },
          totalRevenue: { $sum: { $ifNull: ['$price.platformFee', { $multiply: ['$price.amount', 0.10] }] } }
      } }
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

    const revenueByCategory = await Booking.aggregate([
      { $match: { status: 'completed' } },
      {
        $lookup: {
          from: 'services',
          localField: 'service',
          foreignField: '_id',
          as: 'serviceDetails'
        }
      },
      { $unwind: '$serviceDetails' },
      {
        $group: {
          _id: '$serviceDetails.category',
          totalRevenue: { $sum: '$price.amount' },
          bookingCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }, // Get top 10 categories
      { $project: { _id: 0, category: '$_id', totalRevenue: 1, bookingCount: 1 } }
    ]);

    const recentReviews = await Booking.find({ 'rating.review': { $exists: true, $ne: '' } })
      .sort({ 'rating.date': -1 })
      .limit(5)
      .populate('customer', 'name')
      .select('rating customer');

    res.json({
      totalUsers,
      totalVendors,
      totalBookings,
      completedBookings,
      grossVolume: financialData[0]?.grossVolume || 0,
      totalRevenue: financialData[0]?.totalRevenue || 0,
      monthlyBookings,
      revenueByCategory,
      recentReviews
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
    const { status, search, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    let pipeline = [];

    // Initial match for status
    if (status && status !== 'all') {
      pipeline.push({ $match: { verificationStatus: status } });
    }

    // Join with users to search on user fields
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userData'
      }
    });
    pipeline.push({ $unwind: '$userData' });

    // Add search stage
    if (search) {
      const searchWords = search.split(' ').filter(word => word.length > 0);
      const searchConditions = searchWords.map(word => {
        const searchRegex = new RegExp(word, 'i');
        return {
          $or: [
            { businessName: searchRegex },
            { 'userData.name': searchRegex },
            { 'userData.email': searchRegex },
            { 'userData.phone': searchRegex }
          ]
        };
      });
      if (searchConditions.length > 0) {
        pipeline.push({ $match: { $and: searchConditions } });
      }
    }

    // Facet for pagination and results
    const facet = {
      $facet: {
        vendors: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limitNum },
          { $project: {
              _id: 1, businessName: 1, verificationStatus: 1, createdAt: 1, serviceCategories: 1, 'documents.identityProof': 1,
              user: { _id: '$userData._id', name: '$userData.name', email: '$userData.email', phone: '$userData.phone', createdAt: '$userData.createdAt', isActive: '$userData.isActive', isVerified: '$userData.isVerified' }
          }}
        ],
        total: [{ $count: 'count' }]
      }
    };
    pipeline.push(facet);

    const result = await Vendor.aggregate(pipeline);
    const vendors = result[0].vendors;
    const total = result[0].total[0] ? result[0].total[0].count : 0;

    res.json({
      vendors,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// NEW: Get full details for a specific vendor
router.get('/vendors/:id/details', authorizeRole(['admin']), async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id)
      .populate('user', '-password') // Populate linked user data, exclude password
      .populate('services') // Populate all services offered by this vendor
      .populate('verifiedBy', 'name email'); // Populate admin who verified

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (error) {
    console.error('Error fetching vendor details for admin:', error);
    res.status(500).json({ error: error.message });
  }
});



// ===============================
// Update vendor verification status
// ===============================
router.patch('/vendors/:id/verify', authorizeRole(['admin']), async (req, res) => {
  try {
    const { verificationStatus, adminNotes } = req.body;

    // 1. Validate input
    if (!['verified', 'rejected', 'pending'].includes(verificationStatus)) {
      return res.status(400).json({ error: 'Invalid verificationStatus. Must be one of: verified, rejected, pending.' });
    }

    // 2. Find the vendor
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // 3. Update vendor properties
    vendor.verificationStatus = verificationStatus;
    if (adminNotes) {
      vendor.adminNotes = adminNotes;
    }
    if (verificationStatus === 'verified') {
      vendor.verifiedBy = req.user._id;
      vendor.verificationDate = new Date();
    } else {
      vendor.verifiedBy = null;
      vendor.verificationDate = null;
    }

    // 4. Synchronize the linked User account status
    const isVerifiedForUser = verificationStatus === 'verified'; // User's 'isVerified' status reflects vendor verification
    const isActiveForUser = true; // Keep user account active even if vendor verification is rejected.
                                  // Deactivation should be a separate admin action.

    const updatedUser = await User.findByIdAndUpdate(
      vendor.user,
      { isVerified: isVerifiedForUser, isActive: isActiveForUser },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      console.error(`CRITICAL: Vendor ${vendor._id} has a dangling user reference: ${vendor.user}.`);
      await vendor.save(); // Save the vendor change anyway
      return res.status(500).json({
        error: 'Vendor status updated, but the linked user account could not be found to synchronize. Please investigate.',
        vendor,
      });
    }

    // 5. Save the vendor and respond with the updated user data
    await vendor.save();
    vendor.user = updatedUser; // Attach for the response
    
    const { io } = await import('../index.js');
    io.emit('admin-vendor-status-updated', { vendorId: vendor._id, status: verificationStatus, adminId: req.user._id, adminName: updatedUser.name });

    let newServices = [];
    // If vendor is newly verified, create default services and notify clients
    if (verificationStatus === 'verified') {
      const existingServices = await Service.find({ vendor: vendor._id });
      
      if (existingServices.length === 0 && vendor.serviceCategories?.length > 0) {
        // Fetch the vendor's user profile to get their location coordinates.
        // We already have updatedUser from above, which is the vendor's user document.
        const vendorUser = updatedUser;

        let serviceLocation = null;
        if (vendorUser.address && Array.isArray(vendorUser.address.coordinates) && vendorUser.address.coordinates.length === 2) {
          serviceLocation = {
            type: 'Point',
            coordinates: vendorUser.address.coordinates // [longitude, latitude]
          };
        }

        const defaultServices = vendor.serviceCategories.map(cat => ({
          title: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Service`,
          description: `Professional ${cat.replace('-', ' ')} service by ${vendor.businessName}`,
          category: cat,
          pricing: { type: 'fixed', amount: 500, unit: 'per job' },
          images: DEFAULT_IMAGE,
          ...(serviceLocation && { location: serviceLocation }), // Conditionally add location
          vendor: vendor._id,
          isActive: true,
        }));

        // Use insertMany for efficiency
        const insertedServices = await Service.insertMany(defaultServices);
        vendor.services = insertedServices.map(s => s._id);
        await vendor.save();
        newServices = insertedServices;

        // Log the created services and their image URLs
        insertedServices.forEach(service => {
          console.log(
            `[ADMIN VERIFY LOG] Created default service "${service.title}" for vendor "${vendor.businessName}" with image URL: ${service.images[0]}`
          );
        });

        // Emit real-time event via Socket.IO
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
        io.emit('serviceUpdated', { vendorId: vendor._id, services: populatedServices });
      }
    }

    res.json({
      message: `Vendor status updated to ${verificationStatus}.`,
      vendor,
      newServices,
    });

  } catch (error) {
    console.error('Error during vendor verification:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// Get All Category Suggestions
// ===============================
router.get('/suggestions/categories', authorizeRole(['admin']), async (req, res) => {
  try {
    // Find all vendors who have made a suggestion that isn't empty
    const vendorsWithSuggestions = await Vendor.find({
      suggestedCategory: { $exists: true, $ne: '' }
    })
    .populate('user', 'name email')
    .select('businessName suggestedCategory user');

    // We can also aggregate to get counts of each suggestion
    const suggestionCounts = await Vendor.aggregate([
      { $match: { suggestedCategory: { $exists: true, $ne: '' } } },
      { $group: { _id: '$suggestedCategory', count: { $sum: 1 } } },
      { $project: { suggestion: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      vendors: vendorsWithSuggestions,
      summary: suggestionCounts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// Get all bookings (Unchanged)
// ===============================
router.get('/bookings', authorizeRole(['admin']), async (req, res) => {
  try {
    const { status, page = 1, limit = 20, customerId, vendorId } = req.query;
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    if (customerId) {
      query.customer = customerId;
    }
    if (vendorId) {
      query.vendor = vendorId;
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

// ===============================
// Get Dashboard Activities
// ===============================
router.get('/activities', authorizeRole(['admin']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;

    // Fetch recent bookings and recent reviews (feedbacks)
    const [recentBookings, recentReviews] = await Promise.all([
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('customer', 'name')
        .populate('service', 'title'),
      
      Booking.find({ 'rating.review': { $exists: true, $ne: '' } })
        .sort({ 'rating.date': -1 })
        .limit(limit)
        .populate('customer', 'name')
        .populate('service', 'title')
    ]);

    // Map bookings to a common activity format
    const bookingActivities = recentBookings.map(b => ({
      id: b._id.toString(),
      type: 'booking',
      message: `New booking for ${b.service?.title || 'a service'} by ${b.customer?.name || 'a customer'}.`,
      date: b.createdAt,
      status: b.status, // e.g., 'pending', 'confirmed'
    }));

    // Map reviews to a common activity format
    const reviewActivities = recentReviews.map(r => ({
      id: `${r._id.toString()}-review`, // Unique ID for activity list
      type: 'review', // New type for frontend to handle
      message: `New ${r.rating.score}-star review by ${r.customer?.name || 'Customer'}: "${r.rating.review.substring(0, 50)}..."`,
      date: r.rating.date,
      status: 'success', // Reviews are a positive/neutral event
    }));

    // Combine, sort by date, and limit
    const activities = [...bookingActivities, ...reviewActivities]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);

    res.json({
      activities
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// DANGER ZONE: Clear All Data
// ===============================
router.delete('/clear-all-data', authorizeRole(['admin']), async (req, res) => {
  try {
    const adminUserId = req.user._id;

    // We will not delete the currently logged-in admin.
    // All other users, and all data associated with them, will be deleted.
    const deleteUsersPromise = User.deleteMany({ _id: { $ne: adminUserId } });
    const deleteVendorsPromise = Vendor.deleteMany({});
    const deleteServicesPromise = Service.deleteMany({});
    const deleteBookingsPromise = Booking.deleteMany({});
    const deleteCategoriesPromise = Category.deleteMany({});

    await Promise.all([
      deleteUsersPromise,
      deleteVendorsPromise,
      deleteServicesPromise,
      deleteBookingsPromise,
      deleteCategoriesPromise,
    ]);

    res.json({ message: 'All non-admin data has been cleared successfully. The admin account remains.' });
  } catch (error) {
    console.error('Error clearing all data:', error);
    res.status(500).json({ error: 'Failed to clear all data.' });
  }
});

// ===============================
// Dispute and Report Management
// ===============================

// Get all open disputes
router.get('/disputes', authorizeRole(['admin']), async (req, res) => {
  try {
    const disputes = await Booking.find({ status: 'reported' })
      .populate('customer', 'name email')
      .populate({
        path: 'vendor',
        select: 'businessName user',
        populate: { path: 'user', select: 'name email' }
      })
      .populate('service', 'title')
      .populate({
        path: 'dispute.raisedBy',
        model: 'User',
        select: 'name role'
      })
      .sort({ 'dispute.createdAt': -1 });
    res.json(disputes);
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({ error: 'Server error fetching disputes.' });
  }
});

// Resolve a dispute
router.patch('/disputes/:id/resolve', authorizeRole(['admin']), async (req, res) => {
  const { resolution, finalStatus } = req.body;
  if (!resolution || !finalStatus) {
    return res.status(400).json({ error: 'Resolution notes and a final status are required.' });
  }
  if (!['completed', 'cancelled'].includes(finalStatus)) {
    return res.status(400).json({ error: 'Invalid final status.' });
  }

  try {
    const booking = await Booking.findById(req.params.id).populate('customer', '_id').populate({ path: 'vendor', populate: { path: 'user', select: '_id' } });
    if (!booking || !booking.dispute) {
      return res.status(404).json({ error: 'Disputed booking not found.' });
    }

    booking.dispute.status = 'resolved';
    booking.dispute.resolution = resolution;
    booking.dispute.resolvedBy = req.user._id;
    booking.dispute.resolvedAt = new Date();
    booking.status = finalStatus;

    if (booking.payment) {
      if (finalStatus === 'completed') {
        booking.payment.status = 'payout_pending';
      } else if (finalStatus === 'cancelled') {
        booking.payment.status = 'refund_pending';
      }
    }

    booking.timeline.push({
      status: 'resolved',
      note: `Admin resolved the dispute. Final status set to '${finalStatus}'. Resolution: "${resolution}"`,
    });

    await booking.save();

    const notificationPayload = { bookingId: booking._id, finalStatus, resolution };
    req.io.to(booking.customer._id.toString()).emit('dispute-resolved', notificationPayload);
    if (booking.vendor?.user?._id) {
      req.io.to(booking.vendor.user._id.toString()).emit('dispute-resolved', notificationPayload);
    }

    const { io } = await import('../index.js');
    io.emit('admin-dispute-resolved', { bookingId: booking._id, resolution: resolution, finalStatus: finalStatus, adminId: req.user._id, adminName: req.user.name });

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Server error while resolving dispute.' });
  }
});


// ===============================
// Catalog Management (Categories)
// ===============================

// Get all categories with aggregated stats
router.get('/catalog/categories', authorizeRole(['admin']), async (req, res) => {
  try {
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: 'services', // The collection name for services
          localField: 'slug',
          foreignField: 'category',
          as: 'serviceList'
        }
      },
      {
        $addFields: {
          serviceCount: { $size: '$serviceList' },
          minPrice: { $min: '$serviceList.pricing.amount' },
          maxPrice: { $max: '$serviceList.pricing.amount' }
        }
      },
      {
        $project: {
          serviceList: 0 // Exclude the full service list from the final output
        }
      },
      { $sort: { name: 1 } }
    ]);
    res.json(categories);
    console.log("[Admin API] Categories fetched:", categories.length, "categories.");
  } catch (error) {
    console.error('Error fetching categories with stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new category
router.post('/catalog/categories', authorizeRole(['admin']), upload.none(), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-');

    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(409).json({ error: 'A category with this name already exists.' });
    }

    const category = new Category({ name, slug, isActive: true });
    await category.save();

    // To provide a real-time update with all stats, we can return the newly
    // created category with the same shape as the GET /catalog/categories endpoint.
    // Since it's new, stats will be zero.
    const newCategoryWithStats = {
      ...category.toObject(),
      serviceCount: 0,
      minPrice: null,
      maxPrice: null,
    };

    // Emit a socket event so all connected admin clients can update their lists.
    const { io } = await import('../index.js');
    io.emit('category-created', newCategoryWithStats);
    res.status(201).json(newCategoryWithStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update an existing category (no image handling)
router.put('/catalog/categories/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const slug = name.toLowerCase().replace(/\s+/g, '-');

    // Check if another category already has the new slug
    const existingCategory = await Category.findOne({ slug, _id: { $ne: req.params.id } });
    if (existingCategory) {
      return res.status(409).json({ error: 'Another category with this name already exists.' });
    }

    const updateData = { name, slug };

    const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    const { io } = await import('../index.js');
    io.emit('admin-category-updated', { categoryId: category._id, name: category.name, slug: category.slug, adminId: req.user._id, adminName: req.user.name });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Server error while updating category.' });
  }
});

// Delete category
router.delete('/catalog/categories/:id', authorizeRole(['admin']), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found.' });

    // Safety check: prevent deletion if services are using this category
    const servicesExist = await Service.findOne({ category: category.slug });
    if (servicesExist) {
      return res.status(400).json({ error: 'Cannot delete category. Re-assign services using this category first.' });
    }

    await Category.findByIdAndDelete(req.params.id);

    const { io } = await import('../index.js');
    io.emit('admin-category-deleted', { categoryId: req.params.id, categoryName: category.name, adminId: req.user._id, adminName: req.user.name });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// NEW: Toggle category active status
router.patch('/catalog/categories/:id/toggle', authorizeRole(['admin']), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    // Assumes the Category model has an 'isActive' boolean field.
    category.isActive = !category.isActive;

    const { io } = await import('../index.js');
    io.emit('admin-category-toggled', { categoryId: category._id, isActive: category.isActive, adminId: req.user._id, adminName: req.user.name });
    await category.save();
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Server error while toggling category status.' });
  }
});

// Get all services in the catalog
router.get('/catalog/services', authorizeRole(['admin']), async (req, res) => {
  try {
    const services = await Service.aggregate([
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendor',
          foreignField: '_id',
          as: 'vendorData'
        }
      },
      { $unwind: { path: '$vendorData', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'vendorData.user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          displayImage: {
            $ifNull: [
              { $arrayElemAt: ['$images', 0] },
              PLACEHOLDER_IMAGE_URL
            ]
          },
          vendor: {
             _id: '$vendorData._id',
             businessName: '$vendorData.businessName',
             user: { _id: '$userData._id', name: '$userData.name', email: '$userData.email', city: '$userData.city' }
          }
        }
      },
      { $project: { vendorData: 0, userData: 0 } },
      { $sort: { createdAt: -1 } }
    ]);

    res.json(services);
  } catch (error) {
    console.error('Error fetching services for admin:', error);
    res.status(500).json({ message: 'Server error while fetching services.' });
  }
});

// Toggle Service Active Status
router.patch('/catalog/services/:id/toggle', authorizeRole(['admin']), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    
    service.isActive = !service.isActive;
    await service.save();

    const { io } = await import('../index.js');
    io.emit('admin-service-toggled', { serviceId: service._id, isActive: service.isActive, adminId: req.user._id, adminName: req.user.name });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// Payment & Refund Management
// ===============================
router.patch('/bookings/:id/refund', authorizeRole(['admin']), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    if (booking.payment) {
      booking.payment.status = 'refunded';
    } else {
      booking.payment = { status: 'refunded' };
    }
    
    booking.timeline.push({
      status: booking.status,
      note: 'Admin processed manual refund to customer.',
      timestamp: new Date()
    });
    
    const { io } = await import('../index.js');
    io.emit('admin-payment-rejected', { bookingId: booking._id, reason: reason, adminId: req.user._id, adminName: req.user.name });

    await booking.save();
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process Vendor Payout
router.patch('/bookings/:id/payout', authorizeRole(['admin']), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    if (booking.payment) {
      booking.payment.status = 'paid_to_vendor';
      booking.payment.payoutAt = new Date();
    } else {
      booking.payment = { status: 'paid_to_vendor', payoutAt: new Date() };
    }
    
    booking.timeline.push({
      status: booking.status,
      note: 'Admin released payout to vendor.',
      timestamp: new Date()
    });
    
    const { io } = await import('../index.js');
    io.emit('admin-payment-payout', { bookingId: booking._id, adminId: req.user._id, adminName: req.user.name });

    await booking.save();
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject Manual Payment Proof
router.patch('/bookings/:id/reject-payment', authorizeRole(['admin']), async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    booking.status = 'cancelled';
    if (booking.payment) {
      booking.payment.status = 'pending'; // Reset payment status so it doesn't trigger a refund requirement
    }
    
    booking.timeline.push({
      status: 'cancelled',
      note: `Admin rejected payment proof. Reason: ${reason || 'Invalid or missing payment screenshot.'}`,
      timestamp: new Date()
    });
    
    const { io } = await import('../index.js');
    io.emit('admin-payment-refunded', { bookingId: booking._id, adminId: req.user._id, adminName: req.user.name });

    await booking.save();
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Manual Payment Proof & Dispatch
router.patch('/bookings/:id/verify-payment', authorizeRole(['admin']), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate({
      path: 'vendor',
      populate: { path: 'user', select: '_id' }
    });
    
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    // 1. Mark the payment as successfully received by the platform
    if (booking.payment) {
      booking.payment.status = 'paid_to_platform';
    } else {
      booking.payment = { status: 'paid_to_platform' };
    }
    
    // 2. Update booking status intelligently
    if (booking.status === 'awaiting-payment' || booking.status === 'pending') {
      // Check if this was an add-on payment for an in-progress job
      const previousMeaningfulStatus = booking.timeline
        .slice()
        .reverse()
        .find(t => ['in-progress', 'confirmed', 'pending'].includes(t.status));

      if (previousMeaningfulStatus && previousMeaningfulStatus.status === 'in-progress') {
        booking.status = 'in-progress';
        booking.timeline.push({
          status: 'in-progress',
          note: 'Admin verified add-on payment. Job has resumed.',
          timestamp: new Date()
        });
      } else {
        booking.status = 'confirmed';
        booking.timeline.push({
          status: 'confirmed',
          note: 'Admin verified initial payment proof. Job officially confirmed.',
          timestamp: new Date()
        });
      }
    } else {
      booking.timeline.push({
        status: booking.status,
        note: 'Admin verified payment proof.',
        timestamp: new Date()
      });
    }
    
    const { io } = await import('../index.js');
    io.emit('admin-payment-verified', { bookingId: booking._id, adminId: req.user._id, adminName: req.user.name });

    await booking.save();

    // 3. Notify Vendor that payment is secured and job is confirmed
    if (booking.vendor?.user?._id) {
      req.io.to(booking.vendor.user._id.toString()).emit('booking-status-update', {
        bookingId: booking._id,
        status: booking.status, // Send the actual updated status (could be 'in-progress')
        updatedBy: 'admin'
      });
    }
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
