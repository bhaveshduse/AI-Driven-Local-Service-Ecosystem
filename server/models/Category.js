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
    default: 'https://placehold.co/600x400?text=Category+Image'
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
