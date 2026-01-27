import express from 'express';
import Service from '../models/Service.js';
import Vendor from '../models/Vendor.js';
import User from '../models/User.js';

const router = express.Router();

// Get all services with filters
router.get('/', async (req, res) => {
  try {
    const { category, city, lat, lng, radius = 10, search } = req.query;
    let query = { isActive: true };
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    let services = await Service.find(query)
      .populate({
        path: 'vendor',
        populate: {
          path: 'user',
          select: 'name ratings address'
        }
      })
      .sort({ createdAt: -1 });

    // Location-based filtering
    if (lat && lng) {
      services = services.filter(service => {
        const vendorCoords = service.vendor.user.address?.coordinates;
        if (!vendorCoords) return false;
        
        const distance = calculateDistance(
          parseFloat(lat), parseFloat(lng),
          vendorCoords[1], vendorCoords[0]
        );
        
        return distance <= parseFloat(radius);
      });
    }

    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get service by ID
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

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create service (vendor only)
router.post('/', async (req, res) => {
  try {
    // This would require authentication middleware
    const service = new Service(req.body);
    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get service categories
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

// Utility function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in kilometers
  return d;
}

export default router;