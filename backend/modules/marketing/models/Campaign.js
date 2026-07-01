const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'rejected'],
    default: 'draft'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  budget: {
    type: Number,
    required: true,
    min: 0
  },
  targetAudience: {
    type: String,
    required: true
  },
  platforms: [{
    type: String,
    enum: ['facebook', 'twitter', 'instagram', 'linkedin', 'whatsapp', 'telegram']
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metrics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    spend: { type: Number, default: 0 }
  },
  creative: {
    imageUrl: String,
    headline: String,
    description: String,
    cta: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
campaignSchema.index({ createdBy: 1, status: 1 });
campaignSchema.index({ startDate: 1, endDate: 1 });

// Virtual for campaign duration in days
campaignSchema.virtual('durationInDays').get(function() {
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Pre-save hook to validate dates
campaignSchema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    throw new Error('End date must be after start date');
  }
  next();
});

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
