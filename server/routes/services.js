import express from 'express';
import Service from '../models/Service.js';
import Vendor from '../models/Vendor.js';
import Booking from '../models/Booking.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Category from '../models/Category.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import multer from 'multer';
import { uploadBuffer, deleteAssetByStored, SWAYAM_SERVICES } from '../utils/cloudinary.js';

// Configure Multer for service images (in-memory; persisted to Cloudinary)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};
const upload = multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: 1024 * 1024 * 5 } });

const router = express.Router();

// ------------------------
// Get all services
// ------------------------
router.get('/', async (req, res) => {
  try {
    const { category, search, lat, lng, city, minRating, sort, page, limit } = req.query;

    // --- LOGGING: Show incoming query parameters ---
    console.log('[services.js] Received GET /services request with query:', req.query);

    const MAX_SEARCH_RADIUS_KM = 50; // Cast a wide net, then filter by each vendor's radius.

    let pipeline = [];

    // The aggregation must start from a collection with a geo-index.
    // Assuming the 'users' collection has a 'location' field with a 2dsphere index.
    // The $geoNear stage must be the first stage.

    // 1. Geospatial search on USERS (who are vendors)
    if (lat && lng) {
      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: 'distance',
          key: 'address.coordinates', // Explicitly specify the indexed field
          maxDistance: MAX_SEARCH_RADIUS_KM * 1000,
          // Filter for active vendors early
          query: { role: 'vendor', isActive: true },
          spherical: true
        }
      });
    } else {
      // If not a geo-search, start by finding all active vendors.
      pipeline.push({ $match: { role: 'vendor', isActive: true } });
    }

    // 2. Join with Vendors collection
    pipeline.push(
      { $lookup: { from: 'vendors', localField: '_id', foreignField: 'user', as: 'vendorData' } },
      { $unwind: '$vendorData' }
    );

    // NEW: Filter results from geo-search to only include vendors who serve the user's location.
    // This makes the search much more relevant than using a single, arbitrary radius.
    if (lat && lng) {
      pipeline.push({
        $match: {
          $expr: {
            // $distance is in meters, serviceRadiusKm is in km.
            $lte: ['$distance', { $multiply: ['$serviceRadiusKm', 1000] }]
          }
        }
      });
    }

    // 3. Filter for only verified vendors
    pipeline.push({ $match: { 'vendorData.verificationStatus': 'verified' } });

    // 4. Join with Services collection to get all services for these vendors
    pipeline.push(
      { $lookup: { from: 'services', localField: 'vendorData._id', foreignField: 'vendor', as: 'serviceData' } },
      { $unwind: '$serviceData' }
    );

    // 5. Filter for active services
    pipeline.push({ $match: { 'serviceData.isActive': true } });

    // 6. Apply additional filters on the combined data
    const matchFilters = {};

    if (category) {
      matchFilters['serviceData.category'] = category;
    }

    if (minRating && !isNaN(parseFloat(minRating))) {
      // 'ratings' field is on the root user document
      matchFilters['ratings.average'] = { $gte: parseFloat(minRating) };
    }

    if (Object.keys(matchFilters).length > 0) {
      pipeline.push({ $match: matchFilters });
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'serviceData.title': searchRegex },
            { 'serviceData.description': searchRegex },
            { 'vendorData.businessName': searchRegex },
            { 'serviceData.category': searchRegex }
          ]
        }
      });
    }

    // 7. City Filter (fallback for non-GPS search)
    if (city && (!lat || !lng)) {
      const cityRegex = { $regex: city.trim(), $options: 'i' };
      pipeline.push({
        $match: {
          $or: [
            { 'city': cityRegex }, // Matches the user's primary city
            { 'vendorData.serviceArea.cities': cityRegex } // Matches any city in their service area list
          ]
        }
      });
    }

    // 8. Project final shape to match what the frontend expects
    pipeline.push({
      $project: {
        _id: '$serviceData._id',
        title: '$serviceData.title',
        description: '$serviceData.description',
        category: '$serviceData.category',
        pricing: '$serviceData.pricing',
        createdAt: '$serviceData.createdAt',
        displayImage: {
          $ifNull: [
            { $arrayElemAt: ['$serviceData.images', 0] },
            'https://placehold.co/600x400?text=Service+Image'
          ]
        },
        vendor: {
          _id: '$vendorData._id',
          businessName: '$vendorData.businessName',
          city: {
            $let: {
              vars: {
                primary: '$city', // from the root user document
                filteredCities: {
                  $filter: {
                    input: '$vendorData.serviceArea.cities',
                    as: 'city',
                    cond: { $and: [ { $ne: ['$$city', null] }, { $ne: ['$$city', ''] } ] }
                  }
                }
              },
              in: { $ifNull: [ '$$primary', { $arrayElemAt: ['$$filteredCities', 0] } ] }
            }
          },
          verificationStatus: '$vendorData.verificationStatus',
          user: {
            _id: '$_id', // from the root user document
            name: '$name',
            ratings: '$ratings'
          }
        },
        distance: '$distance' // Include distance from geo-search
      }
    });

    // 9. Add Sorting Stage
    const sortStage = {};
    switch (sort) {
      case 'price-asc':
        sortStage['pricing.amount'] = 1;
        break;
      case 'price-desc':
        sortStage['pricing.amount'] = -1;
        break;
      case 'rating-desc':
        sortStage['vendor.user.ratings.average'] = -1;
        break;
      case 'nearest':
        if (lat && lng) {
          sortStage.distance = 1; // Closest first
        } else {
          // If no location, 'nearest' is meaningless. Fallback to a relevance-like sort.
          sortStage['vendor.user.ratings.average'] = -1;
          sortStage.createdAt = -1;
        }
        break;
      case 'relevance':
      default:
        if (lat && lng) {
          sortStage.distance = 1; // Closest first
        } else {
          // Default relevance: best rating, then newest service
          sortStage['vendor.user.ratings.average'] = -1;
          sortStage.createdAt = -1;
        }
        break;
    }
    pipeline.push({ $sort: sortStage });

    // 10. Add Pagination using $facet
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 12;
    const skip = (pageNum - 1) * limitNum;

    pipeline.push({
      $facet: {
        services: [
          { $skip: skip },
          { $limit: limitNum }
        ],
        totalCount: [
          { $count: 'count' }
        ]
      }
    });

    // --- LOGGING: Show the full aggregation pipeline before execution ---
    console.log('[services.js] Executing aggregation pipeline:', JSON.stringify(pipeline, null, 2));

    const results = await User.aggregate(pipeline);

    const services = results[0].services;
    const totalServices = results[0].totalCount[0] ? results[0].totalCount[0].count : 0;
    const totalPages = Math.ceil(totalServices / limitNum);

    // --- LOGGING: Show the results of the aggregation ---
    console.log(`[services.js] Aggregation found ${services.length} services for page ${pageNum}. Total services: ${totalServices}.`);
    if (services.length > 0) {
      console.log('[services.js] First service result:', services[0]);
    }

    res.json({ services, totalPages });

  } catch (error) {
    console.error('[services.js] Critical error in GET /services:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// ------------------------
// Get search suggestions
// ------------------------
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const searchRegex = new RegExp(q, 'i');

    // Search for distinct service titles and categories that match
    const services = await Service.aggregate([
      // Find active services matching the query in title or category
      {
        $match: {
          isActive: true,
          $or: [
            { title: searchRegex },
            { category: searchRegex }
          ]
        }
      },
      // Limit to reduce processing
      { $limit: 50 },
      { $project: { title: 1, category: 1 } }
    ]);

    // Create a set of unique suggestions
    const suggestions = new Set();
    services.forEach(service => {
      if (searchRegex.test(service.title)) suggestions.add(service.title);
      if (searchRegex.test(service.category)) {
        const formattedCategory = service.category.charAt(0).toUpperCase() + service.category.slice(1).replace(/-/g, ' ');
        suggestions.add(formattedCategory);
      }
    });

    res.json(Array.from(suggestions).slice(0, 8));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------------
// Get service by ID
// ------------------------
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate({
        path: 'vendor',
        select: 'businessName verificationStatus serviceArea workingLocation experience city',
        populate: {
          path: 'user',
          select: 'name ratings address avatar'
        }
      });

    if (!service) return res.status(404).json({ error: 'Service not found' });

    if (service.vendor?.verificationStatus !== 'verified') {
      return res.status(404).json({ error: 'Service not found or vendor not verified' });
    }

    // Convert to plain object to add a new property
    const serviceObj = service.toObject();
    
    // Dynamically determine the displayImage
    if (serviceObj.images && serviceObj.images.length > 0) {
      serviceObj.displayImage = serviceObj.images[0];
    } else {
      serviceObj.displayImage = 'https://placehold.co/600x400?text=Service+Image';
    }

    res.json(serviceObj);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------------
// Create service (vendor only)
// ------------------------
router.post('/', authenticateToken, authorizeRole(['vendor']), upload.array('images', 5), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found.' });
    }

    if (vendor.verificationStatus !== 'verified') {
      return res.status(403).json({ error: 'Vendor not verified.' });
    }

    // Fetch the vendor's user profile to get their location coordinates.
    const vendorUser = await User.findById(vendor.user).select('address');
    if (!vendorUser) {
      return res.status(500).json({ error: 'Data integrity error: Could not find user profile for this vendor.' });
    }

    // --- Data Parsing ---
    // For objects, parse directly and let the main try/catch handle errors.
    const pricing = typeof req.body.pricing === 'string' ? JSON.parse(req.body.pricing) : req.body.pricing;
    const duration = typeof req.body.duration === 'string' ? JSON.parse(req.body.duration) : req.body.duration;

    // For optional arrays, a safe parse helper is cleaner.
    const safeParseArray = (data) => {
      if (!data) return [];
      try {
        const parsed = JSON.parse(data);
        // Ensure it's an array and filter out any empty strings from the frontend.
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch (e) {
        return [];
      }
    };

    // Upload images to Cloudinary
    let images = [];
    if (req.files && req.files.length) {
      images = await Promise.all(
        req.files.map(file => uploadBuffer(file.buffer, { folder: SWAYAM_SERVICES }).then(r => r.stored))
      );
    }

    const serviceData = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      pricing: pricing,
      duration: duration,
      included: safeParseArray(req.body.included), // Use safeParseArray for optional lists
      excluded: safeParseArray(req.body.excluded),
      requirements: safeParseArray(req.body.requirements),
      vendor: vendor._id,
      images,
    };

    // Conditionally add the location field to prevent Mongo geo index errors.
    // Prefer vendor's workingLocation, fall back to user address coordinates.
    const vendorCoords =
      (vendor.workingLocation?.coordinates?.length === 2 && vendor.workingLocation.coordinates) ||
      (vendorUser.address?.coordinates?.length === 2 && vendorUser.address.coordinates);

    if (vendorCoords) {
      serviceData.location = {
        type: 'Point',
        coordinates: vendorCoords,
      };
    } else {
      serviceData.location = undefined;
    }

    const service = new Service(serviceData);
    await service.save();

    // Also add the service to the vendor's list of services
    vendor.services.push(service._id);
    await vendor.save();

    // Populate the new service to match the structure expected by the frontend for real-time updates
    const populatedService = await Service.findById(service._id).populate({
      path: 'vendor',
      select: 'businessName verificationStatus user',
      populate: {
        path: 'user',
        select: 'name ratings',
      },
    });

    // Emit real-time event via Socket.IO to update all connected clients
    if (populatedService) {
      const { io } = await import('../index.js');
      io.emit('serviceUpdated', {
        vendorId: vendor._id,
        userId: vendor.user,
        services: [populatedService],
      });
    }

    res.status(201).json(service);
  } catch (error) {
    // Enhanced error logging for easier debugging
    console.error("SERVICE CREATION ERROR:", error);
    res.status(500).json({ error: 'Service creation failed. Please check your input and try again.' });
  }
});

// ------------------------
// Update a service (vendor only)
// ------------------------
router.put('/:id', authenticateToken, authorizeRole(['vendor']), upload.array('images', 5), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) return res.status(404).json({ error: 'Vendor profile not found.' });

    // Find the service before updating to get the old image list for cleanup
    const serviceToUpdate = await Service.findOne({ _id: req.params.id, vendor: vendor._id });
    if (!serviceToUpdate) return res.status(404).json({ error: 'Service not found or you do not have permission to edit it.' });

    // Parse JSON fields if they come as strings
    if (typeof req.body.pricing === 'string') req.body.pricing = JSON.parse(req.body.pricing);
    if (typeof req.body.duration === 'string') req.body.duration = JSON.parse(req.body.duration);
    if (typeof req.body.included === 'string') req.body.included = JSON.parse(req.body.included).filter(Boolean);
    if (typeof req.body.excluded === 'string') req.body.excluded = JSON.parse(req.body.excluded).filter(Boolean);
    if (typeof req.body.requirements === 'string') req.body.requirements = JSON.parse(req.body.requirements).filter(Boolean);
    // Also parse existingImages sent from the frontend
    const existingImagesToKeep = (typeof req.body.existingImages === 'string')
      ? JSON.parse(req.body.existingImages)
      : (Array.isArray(req.body.existingImages) ? req.body.existingImages : []);

    // --- Build updateData explicitly for clarity and safety ---
    // This prevents any unexpected fields from req.body from being part of the update.
    const updateData = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      pricing: req.body.pricing,
      duration: req.body.duration,
      included: Array.isArray(req.body.included) ? req.body.included.filter(Boolean) : [],
      excluded: Array.isArray(req.body.excluded) ? req.body.excluded.filter(Boolean) : [],
      requirements: Array.isArray(req.body.requirements) ? req.body.requirements.filter(Boolean) : [],
    };

    // --- IMAGE HANDLING ---
    // Upload any newly uploaded files to Cloudinary.
    let newImages = [];
    if (req.files && req.files.length) {
      newImages = await Promise.all(
        req.files.map(f => uploadBuffer(f.buffer, { folder: SWAYAM_SERVICES }).then(r => r.stored))
      );
    }

    // The final array of images is the combination of kept existing images and new uploads.
    updateData.images = [...existingImagesToKeep, ...newImages];

    // --- ORPHANED IMAGE DELETION ---
    // Compare the old image array with the new one to find images that were removed.
    const oldImages = serviceToUpdate.images || [];
    const newImagesFinal = updateData.images;
    const imagesToDelete = oldImages.filter(oldImg => !newImagesFinal.includes(oldImg));

    for (const imagePath of imagesToDelete) {
      try {
        await deleteAssetByStored(imagePath);
      } catch (err) {
        console.error(`Failed to delete orphaned image: ${imagePath}`, err);
      }
    }

    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, vendor: vendor._id }, // Ensure vendor owns this service
      updateData,
      { new: true, runValidators: true }
    );

    // Populate the updated service to match the structure expected by the frontend for real-time updates
    const populatedService = await Service.findById(service._id)
      .populate({
        path: 'vendor',
        select: 'businessName verificationStatus user',
        populate: {
          path: 'user',
          select: 'name ratings'
        }
      });

    // Emit real-time event via Socket.IO to update all connected clients
    if (populatedService) {
      const { io } = await import('../index.js');
      io.emit('serviceUpdated', {
        vendorId: vendor._id,
        userId: vendor.user, // Add userId for client-side filtering
        services: [populatedService]
      });
    }

    res.json(populatedService);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------------
// Delete a service (vendor only)
// ------------------------
router.delete('/:id', authenticateToken, authorizeRole(['vendor']), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) return res.status(404).json({ error: 'Vendor profile not found.' });

    const service = await Service.findOneAndDelete({ _id: req.params.id, vendor: vendor._id });

    if (!service) return res.status(404).json({ error: 'Service not found or you do not have permission to delete it.' });

    // Remove associated Cloudinary images
    for (const imageUrl of (service.images || [])) {
      try {
        await deleteAssetByStored(imageUrl);
      } catch (err) {
        console.error(`Failed to delete image: ${imageUrl}`, err);
      }
    }

    // Remove the service from the vendor's services array
    await Vendor.updateOne({ _id: vendor._id }, { $pull: { services: service._id } });

    // Emit a real-time event to notify clients of the deletion
    const { io } = await import('../index.js');
    io.emit('serviceDeleted', {
      serviceId: service._id,
      vendorId: vendor._id,
      userId: vendor.user // Add userId for client-side filtering
    });

    res.json({ message: 'Service deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------------
// Toggle service active status (vendor only)
// ------------------------
router.patch('/:id/toggle-active', authenticateToken, authorizeRole(['vendor']), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) return res.status(404).json({ error: 'Vendor profile not found.' });

    const service = await Service.findOne({ _id: req.params.id, vendor: vendor._id });
    if (!service) return res.status(404).json({ error: 'Service not found or you do not have permission to edit it.' });

    service.isActive = !service.isActive;
    await service.save();

    // Populate and emit event, similar to the PUT route
    const populatedService = await Service.findById(service._id)
      .populate({
        path: 'vendor',
        select: 'businessName verificationStatus user',
        populate: {
          path: 'user',
          select: 'name ratings'
        }
      });

    if (populatedService) {
      const { io } = await import('../index.js');
      io.emit('serviceUpdated', {
        vendorId: vendor._id,
        userId: vendor.user,
        services: [populatedService]
      });
    }

    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------------
// Get service categories
// ------------------------
router.get('/categories/list', async (req, res) => {
    try {
        // Fetch all active categories from the Category collection, which is the source of truth.
        // This ensures all available categories are shown, not just those with existing services.
        const categories = await Category.find({ isActive: { $ne: false } })
            .sort({ priority: -1, name: 1 });
        // Return the full category object to be consistent across the app
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
