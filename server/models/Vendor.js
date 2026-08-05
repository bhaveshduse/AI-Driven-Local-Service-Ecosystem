import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  primaryCategory: {
    type: String, // This will store the slug of the category
    trim: true
  },
  serviceCategories: [{
    type: String,
    // The enum is removed to allow for dynamic categories from the Category collection.
  }],
  suggestedCategory: {
    type: String,
    trim: true
  },
  serviceArea: {
    radius: {
      type: Number,
      default: 10 // kilometers
    },
    cities: [String]
  },
  // Current working location for mobile vendors. Falls back to address.coordinates when null.
  workingLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      default: undefined
    }
  },
  availability: {
    schedule: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      startTime: String,
      endTime: String,
      available: {
        type: Boolean,
        default: true
      }
    }],
    timeSlots: [{
      date: Date,
      slots: [{
        startTime: String,
        endTime: String,
        isBooked: {
          type: Boolean,
          default: false
        }
      }]
    }]
  },
  pricing: {
    baseRate: Number,
    hourlyRate: Number,
    minimumCharge: Number
  },
  documents: {
    businessLicense: String,
    insurance: String,
    certifications: [String],
    identityProof: String // Path to Aadhaar/ID file
  },
  experience: {
    type: Number,
    default: 0 // years
  },
  description: {
    type: String,
    maxlength: 1000
  },
  portfolio: [String], // image URLs
  verificationStatus: {
      type: String,
      enum: ['not-submitted', 'pending', 'verified', 'rejected'],
      default: 'not-submitted'
  },
  // 💡 Audit Trail Fields:
  verifiedBy: { // Who performed the verification
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
  },
  verificationDate: { // When the verification occurred
      type: Date,
      default: null
  },
  adminNotes: { // Notes from admin regarding verification status (e.g., rejection reason)
    type: String,
    default: ''
  },
}, {
    timestamps: true
});

export default mongoose.model('Vendor', vendorSchema);
