import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  slug: { // e.g., 'plumbing'
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  name: { // e.g., 'Plumbing'
    type: String,
    required: true,
    trim: true,
  },
  image: {
    type: String,
    required: true
  },
  icon: { // e.g., '🔧'
    type: String,
    default: '🛠️',
  },
  description: {
    type: String,
    trim: true,
  }
}, { timestamps: true });

export default mongoose.model('Category', categorySchema);