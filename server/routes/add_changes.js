// Admin: Run Migration
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
