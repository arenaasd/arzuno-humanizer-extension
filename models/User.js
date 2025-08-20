// models/User.js - Updated User model
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  wordsLeft: {
    type: Number,
    default: 10000, // Free words for new user
    min: 0,
  },
  totalWordsUsed: {
    type: Number,
    default: 0, // Track total usage for analytics
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
  premiumExpiry: {
    type: Date, // if premium, expiry date
  },
  subscriptionId: {
    type: String, // Stripe subscription ID or other payment provider
  },
  lastUsed: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ isPremium: 1, premiumExpiry: 1 });

// Method to check if user is premium
UserSchema.methods.isActivePremium = function() {
  return this.isPremium && this.premiumExpiry && this.premiumExpiry > new Date();
};

// Method to get days until premium expires
UserSchema.methods.getDaysUntilExpiry = function() {
  if (!this.premiumExpiry) return null;
  const now = new Date();
  const expiry = new Date(this.premiumExpiry);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Pre-save middleware to update lastUsed
UserSchema.pre('save', function(next) {
  if (this.isModified('wordsLeft') || this.isModified('totalWordsUsed')) {
    this.lastUsed = new Date();
  }
  next();
});

// Prevent model overwrite in dev hot-reload
export default mongoose.models.User || mongoose.model("User", UserSchema);