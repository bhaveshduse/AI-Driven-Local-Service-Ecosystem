import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js'; // Adjust path if needed based on your project structure

dotenv.config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Swayam';
const DEFAULT_CITY = 'Not Specified';

const runMigration = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    console.log(`Starting migration: Add default city ('${DEFAULT_CITY}') to users...`);

    const result = await User.updateMany(
      { city: { $exists: false } }, // Find all users where 'city' field does not exist
      { $set: { city: DEFAULT_CITY } } // Set the 'city' field to the default value
    );

    console.log('Migration completed.');
    console.log(`- Documents matched for update: ${result.matchedCount}`);
    console.log(`- Documents modified: ${result.modifiedCount}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    console.log('Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

runMigration();