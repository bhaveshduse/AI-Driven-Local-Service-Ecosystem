import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'plumbing',
      'electrical',
      'carpentry',
      'cleaning',
      'painting',
      'appliance-repair',
      'hvac',
      'landscaping',
      'moving',
      'pest-control',
      'handyman'
    ]
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  pricing: {
    type: {
      type: String,
      enum: ['fixed', 'hourly', 'custom'],
      default: 'fixed'
    },
    amount: Number,
    unit: String // 'per hour', 'per service', 'per sq ft', etc.
  },
  duration: {
    estimated: Number, // in minutes
    unit: {
      type: String,
      default: 'minutes'
    }
  },
  images: [String],
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  requirements: [String], // what customer needs to provide
  included: [String], // what's included in the service
  excluded: [String] // what's not included
}, {
  timestamps: true
});

export default mongoose.model('Service', serviceSchema);