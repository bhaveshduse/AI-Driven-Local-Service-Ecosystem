import express from 'express';
import Service from '../models/Service.js';
import Vendor from '../models/Vendor.js';
import User from '../models/User.js';

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
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate({
        path: 'vendor',
        populate: {
          path: 'user',
          select: 'name email phone ratings address profileImage'
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
router.post('/', async (req, res) => {
  try {
    // Add auth middleware later
    const service = new Service(req.body);
    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------
// Get service categories
// ------------------------
router.get('/categories/list', async (req, res) => {
  try {
    const categories = [
      { id: 'plumbing', name: 'Plumbing', icon: '🔧' },
      { id: 'electrical', name: 'Electrical', icon: '⚡' },
      { id: 'carpentry', name: 'Carpentry', icon: '🔨' },
      { id: 'cleaning', name: 'Cleaning', icon: '🧽' },
      { id: 'painting', name: 'Painting', icon: '🎨' },
      { id: 'appliance-repair', name: 'Appliance Repair', icon: '🔌' },
      { id: 'hvac', name: 'HVAC', icon: '❄️' },
      { id: 'landscaping', name: 'Landscaping', icon: '🌱' },
      { id: 'moving', name: 'Moving', icon: '📦' },
      { id: 'pest-control', name: 'Pest Control', icon: '🐛' },
      { id: 'handyman', name: 'Handyman', icon: '🛠️' }
    ];
    res.json(categories);
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
