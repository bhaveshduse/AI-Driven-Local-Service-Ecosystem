import express from 'express';
import Service from '../models/Service.js';
import Vendor from '../models/Vendor.js';
import User from '../models/User.js';

const router = express.Router();

// Get all services with filters (MODIFIED to use aggregation for verification filter)
router.get('/', async (req, res) => {
  try {
    const { category, city, lat, lng, radius = 10, search } = req.query;
    
    // 💡 Using aggregation to filter on a field in a populated collection (Vendor)
    let pipeline = [];
    
    // Stage 1: Lookup (Join) the Vendor collection
    pipeline.push({
        $lookup: {
            from: 'vendors', // Check your actual collection name, typically 'vendors'
            localField: 'vendor',
            foreignField: '_id',
            as: 'vendorData'
        }
    });

    // Stage 2: Unwind the Vendor array
    pipeline.push({ $unwind: '$vendorData' });

    // Stage 3: Filter by Vendor Verification Status and Service isActive
    pipeline.push({
        $match: {
            'vendorData.verificationStatus': 'verified', // CRITICAL FILTER
            'isActive': true // Service isActive filter
        }
    });
    
    // Category filter
    if (category) {
        pipeline.push({ $match: { category: category } });
    }
    
    // Search filter
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

    // Stage 4: Lookup (Join) the User collection
    pipeline.push({
        $lookup: {
            from: 'users', // Check your actual collection name, typically 'users'
            localField: 'vendorData.user',
            foreignField: '_id',
            as: 'userData'
        }
    });
    pipeline.push({ $unwind: '$userData' });

    // Stage 5: Project (Shape) the output for the response
    pipeline.push({
        $project: {
            // Service fields
            _id: 1, title: 1, description: 1, price: 1, category: 1, isActive: 1, tags: 1, createdAt: 1,
            // Restructure Vendor/User data to match expected output structure
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

    // Execute the aggregation pipeline
    let services = await Service.aggregate(pipeline).sort({ createdAt: -1 });

    // Location-based filtering (remains in JavaScript after aggregation)
    if (lat && lng) {
      services = services.filter(service => {
        // Note: The path for vendorCoords changes due to aggregation projection!
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

// Get service by ID (MODIFIED with verification check)
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
    
    // 💡 CRITICAL CHECK: Ensure the linked vendor is verified
    if (service.vendor && service.vendor.verificationStatus !== 'verified') {
        return res.status(404).json({ error: 'Service not found or vendor is not verified.' });
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
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *     Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in kilometers
  return d;
}

export default router;