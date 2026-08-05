import express from 'express';
// Admin: Run Migration
import Vendor from '../models/Vendor.js';
import Service from '../models/Service.js';
import Category from '../models/Category.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/run-migration', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const vendors = await Vendor.find({ verificationStatus: 'verified' });
    let totalInserted = 0;

    for (const vendor of vendors) {
      const existingServices = await Service.find({ vendor: vendor._id });
      if (existingServices.length === 0) {
        const defaultServices = vendor.serviceCategories.map(cat => ({
          title: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Service`,
          description: `Professional ${cat.replace('-', ' ')} service by ${vendor.businessName}`,
          category: cat,
          pricing: { type: 'fixed', amount: 500, unit: 'per job' },
          images: [],
          vendor: vendor._id,
          isActive: true,
        }));

        const insertedServices = await Service.insertMany(defaultServices);
        vendor.services = insertedServices.map(s => s._id);
        await vendor.save();
        totalInserted += insertedServices.length;
      }
    }

    res.json({ message: `Migration completed. Total services added: ${totalInserted}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Migration failed.' });
  }
});

// Admin: Seed initial categories into the database
router.post('/seed-categories', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const initialCategories = [
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

    // Use updateOne with upsert to avoid creating duplicates if run multiple times
    const operations = initialCategories.map(cat => ({
      updateOne: {
        filter: { id: cat.id },
        update: { $set: cat },
        upsert: true
      }
    }));

    const result = await Category.bulkWrite(operations);

    res.json({ 
      message: 'Categories seeded successfully.',
      result
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to seed categories.' });
  }
});

export default router;
