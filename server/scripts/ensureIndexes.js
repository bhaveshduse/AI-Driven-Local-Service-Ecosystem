import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Swayam';

async function ensureIndexes() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    const db = mongoose.connection.db;

    // 1. 2dsphere index on services.location for geospatial vendor queries
    const servicesCollection = db.collection('services');
    await servicesCollection.createIndex(
      { location: '2dsphere' },
      { name: 'services_location_2dsphere', background: true }
    );
    console.log('✅ Created 2dsphere index on services.location');

    // 2. 2dsphere index on users.address.coordinates for geo-near aggregations
    const usersCollection = db.collection('users');
    await usersCollection.createIndex(
      { 'address.coordinates': '2dsphere' },
      { name: 'users_address_coordinates_2dsphere', background: true }
    );
    console.log('✅ Created 2dsphere index on users.address.coordinates');

    // 3. Compound index for service queries
    await servicesCollection.createIndex(
      { category: 1, isActive: 1 },
      { name: 'services_category_isActive', background: true }
    );
    console.log('✅ Created compound index on services.{category, isActive}');

    // 4. Compound index for vendor service lookups
    await servicesCollection.createIndex(
      { vendor: 1, isActive: 1 },
      { name: 'services_vendor_isActive', background: true }
    );
    console.log('✅ Created compound index on services.{vendor, isActive}');

    // 5. Text index for service search
    await servicesCollection.createIndex(
      { title: 'text', description: 'text', tags: 'text' },
      { name: 'services_text_search', background: true }
    );
    console.log('✅ Created text index on services.{title, description, tags}');

    // 6. Index for booking queries by vendor and status
    const bookingsCollection = db.collection('bookings');
    await bookingsCollection.createIndex(
      { vendor: 1, status: 1 },
      { name: 'bookings_vendor_status', background: true }
    );
    console.log('✅ Created compound index on bookings.{vendor, status}');

    // 7. Index for booking queries by customer
    await bookingsCollection.createIndex(
      { customer: 1, createdAt: -1 },
      { name: 'bookings_customer_createdAt', background: true }
    );
    console.log('✅ Created compound index on bookings.{customer, createdAt}');

    console.log('\n🎉 All indexes ensured successfully.');
  } catch (error) {
    console.error('❌ Index creation failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed.');
    process.exit(0);
  }
}

ensureIndexes();
