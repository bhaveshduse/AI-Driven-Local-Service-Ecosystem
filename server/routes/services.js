import express from 'express';
import Service from '../models/Service.js';
import Vendor from '../models/Vendor.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure Multer for service images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'service-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const router = express.Router();

// ------------------------
// Get all services
// ------------------------
router.get('/', async (req, res) => {
  try {
    const { category, search, lat, lng, radius = 10 } = req.query;

    let pipeline = [];

    // 1️⃣ Join Vendor
    pipeline.push({
      $lookup: {
        from: 'vendors',
        localField: 'vendor',
        foreignField: '_id',
        as: 'vendorData'
      }
    });
    pipeline.push({ $unwind: '$vendorData' });

    // 2️⃣ Filter active services and verified vendors
    pipeline.push({
      $match: {
        'vendorData.verificationStatus': 'verified',
        'isActive': true
      }
    });

    // 3️⃣ Category filter
    if (category) pipeline.push({ $match: { category } });

    // 4️⃣ Search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
          ]
        }
      });
    }

    // 5️⃣ Join User
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'vendorData.user',
        foreignField: '_id',
        as: 'userData'
      }
    });
    pipeline.push({ $unwind: '$userData' });

    // 6️⃣ Project
    pipeline.push({
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        category: 1,
        isActive: 1,
        tags: 1,
        images: 1,
        createdAt: 1,
        pricing: 1,
        price: '$pricing.amount', // frontend convenience
        vendor: {
          _id: '$vendorData._id',
          businessName: '$vendorData.businessName',
          serviceCategories: '$vendorData.serviceCategories',
          user: {
            _id: '$userData._id',
            name: '$userData.name',
            ratings: '$userData.ratings',
            address: '$userData.address'
          }
        }
      }
    });

    let services = await Service.aggregate(pipeline).sort({ createdAt: -1 });

    // 7️⃣ Optional location filter
    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);

      services = services.filter(service => {
        const coords = service.vendor.user.address?.coordinates;
        if (!coords || coords.length !== 2) return true; // keep if missing
        const distance = calculateDistance(latNum, lngNum, coords[1], coords[0]);
        return distance <= parseFloat(radius);
      });
    }

    res.json(services);

  } catch (error) {
    res.status(500).json({ error: error.message });
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
        populate: {
          path: 'user',
          select: 'name ratings address profileImage'
        }
      });

    if (!service) return res.status(404).json({ error: 'Service not found' });

    if (service.vendor?.verificationStatus !== 'verified') {
      return res.status(404).json({ error: 'Service not found or vendor not verified' });
    }

    res.json(service);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------
// Create service (vendor only)
// ------------------------
router.post('/', authenticateToken, authorizeRole(['vendor']), upload.array('images', 5), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found for the current user.' });
    }

    if (vendor.verificationStatus !== 'verified') {
      return res.status(403).json({ error: 'Your vendor profile must be verified to create services.' });
    }

    // Parse JSON fields if they come as strings (FormData)
    if (typeof req.body.pricing === 'string') req.body.pricing = JSON.parse(req.body.pricing);
    if (typeof req.body.duration === 'string') req.body.duration = JSON.parse(req.body.duration);
    if (typeof req.body.included === 'string') req.body.included = JSON.parse(req.body.included);
    if (typeof req.body.excluded === 'string') req.body.excluded = JSON.parse(req.body.excluded);
    if (typeof req.body.requirements === 'string') req.body.requirements = JSON.parse(req.body.requirements);
    if (typeof req.body.tags === 'string') req.body.tags = JSON.parse(req.body.tags);

    // Handle images
    const imagePaths = req.files ? req.files.map(file => file.path.replace(/\\/g, '/')) : [];

    const service = new Service({
      ...req.body,
      vendor: vendor._id, // Ensure the service is linked to the correct vendor
      images: imagePaths
    });

    await service.save();

    // Also add the service to the vendor's list of services
    vendor.services.push(service._id);
    await vendor.save();

    // Populate the new service to match the structure expected by the frontend for real-time updates
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
      io.emit('serviceUpdated', { vendorId: vendor._id, services: [populatedService] });
    }

    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------
// Update a service (vendor only)
// ------------------------
router.put('/:id', authenticateToken, authorizeRole(['vendor']), upload.array('images', 5), async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) return res.status(404).json({ error: 'Vendor profile not found.' });

    // Parse JSON fields if they come as strings
    if (typeof req.body.pricing === 'string') req.body.pricing = JSON.parse(req.body.pricing);
    if (typeof req.body.duration === 'string') req.body.duration = JSON.parse(req.body.duration);
    if (typeof req.body.included === 'string') req.body.included = JSON.parse(req.body.included);
    if (typeof req.body.excluded === 'string') req.body.excluded = JSON.parse(req.body.excluded);
    if (typeof req.body.requirements === 'string') req.body.requirements = JSON.parse(req.body.requirements);
    if (typeof req.body.tags === 'string') req.body.tags = JSON.parse(req.body.tags);

    let updateData = { ...req.body };

    // If new images are uploaded, append them to the existing ones
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => f.path.replace(/\\/g, '/'));
      const existingService = await Service.findOne({ _id: req.params.id, vendor: vendor._id });
      if (existingService) {
        // Combine existing images with new ones
        updateData.images = [...(existingService.images || []), ...newImages];
      }
    }

    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, vendor: vendor._id }, // Ensure vendor owns this service
      updateData,
      { new: true, runValidators: true }
    );

    if (!service) return res.status(404).json({ error: 'Service not found or you do not have permission to edit it.' });

    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    // Remove the service from the vendor's services array
    await Vendor.updateOne({ _id: vendor._id }, { $pull: { services: service._id } });

    res.json({ message: 'Service deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------
// Get service categories
// ------------------------
router.get('/categories/list', async (req, res) => {
  try {
    // Aggregate distinct categories from active services with verified vendors
    const categories = await Service.aggregate([
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendor',
          foreignField: '_id',
          as: 'vendorData'
        }
      },
      { $unwind: '$vendorData' },
      {
        $match: {
          'isActive': true,
          'vendorData.verificationStatus': 'verified'
        }
      },
      {
        $group: {
          _id: '$category'
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(categories.map(cat => ({
      id: cat._id,
      name: cat._id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------
// Helper: Distance calculation
// ------------------------
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default router;
