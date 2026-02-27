import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },

  name: {
    type: String,
    required: [true, 'Category name is required.'],
    unique: true,
    trim: true,
  },

  image: {
    type: String,
    // Having a default image makes the API more robust against missing uploads.
    // Ensure this file exists in your `uploads` directory or is publicly accessible.
    default: 'uploads/default-category.png'
  },

  icon: {
    type: String,
    default: '🛠️',
  },

  description: {
    type: String,
    trim: true,
  },

  // 🔥 IMPORTANT FOR AI FILTERING
  isActive: {
    type: Boolean,
    default: true,
  },

  // 🔥 Optional: AI optimization
  aiLabel: {
    type: String,
    trim: true,
  },

  // 🔥 Optional: sort order
  priority: {
    type: Number,
    default: 0,
    index: true,
  }

}, { timestamps: true });

export default mongoose.model('Category', categorySchema);
