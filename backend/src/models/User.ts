import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// Install bcryptjs first: npm install bcryptjs && npm install --save-dev @types/bcryptjs

export interface IUser extends Document {
  email: string;
  password: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  
  // Subscription Management
  subscriptionTier: 'base' | 'premium';
  premiumPurchaseDate?: Date;
  premiumTransactionId?: string;
  
  // Referral System
  referralCode: string;
  referredBy?: mongoose.Types.ObjectId;
  referralCount: number;
  referredUsers: mongoose.Types.ObjectId[];
  unlockedMovieSlots: number; // Calculated: 20 + (referralCount * 10), max 50
  
  // Social Features (Phase 3 Ready)
  friends: mongoose.Types.ObjectId[];
  friendRequests: {
    sent: mongoose.Types.ObjectId[];
    received: mongoose.Types.ObjectId[];
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    rankingsVisibility: 'public' | 'friends' | 'private';
  };
  
  // Activity Tracking
  stats: {
    totalMoviesRanked: number;
    moviesRankedThisWeek: number;
    lastRankingDate?: Date;
    rankingStreak: number;
    joinedDate: Date;
  };
  
  // Preferences
  favoriteGenres: string[];
  streamingServices: string[]; // Netflix, Hulu, etc.
  
  // Account Status
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateReferralCode(): string;
  canViewRankingPosition(position: number): boolean;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false // Don't include password in queries by default
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  displayName: {
    type: String,
    maxlength: 50
  },
  profilePicture: String,
  
  subscriptionTier: {
    type: String,
    enum: ['base', 'premium'],
    default: 'base'
  },
  premiumPurchaseDate: Date,
  premiumTransactionId: String,
  
  referralCode: {
    type: String,
    unique: true,
    required: true
  },
  referredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCount: {
    type: Number,
    default: 0,
    max: 3
  },
  referredUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  unlockedMovieSlots: {
    type: Number,
    default: 20 // Base users start with top 10 + bottom 10
  },
  
  friends: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: {
    sent: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    received: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public'
    },
    rankingsVisibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public'
    }
  },
  
  stats: {
    totalMoviesRanked: { type: Number, default: 0 },
    moviesRankedThisWeek: { type: Number, default: 0 },
    lastRankingDate: Date,
    rankingStreak: { type: Number, default: 0 },
    joinedDate: { type: Date, default: Date.now }
  },
  
  favoriteGenres: [String],
  streamingServices: [String],
  
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Note: email, username, and referralCode indexes are created via "unique: true" in schema definition

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate referral code before saving new user
userSchema.pre('save', function(next) {
  if (this.isNew && !this.referralCode) {
    this.referralCode = this.generateReferralCode();
  }
  next();
});

// Methods
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateReferralCode = function(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

userSchema.methods.canViewRankingPosition = function(position: number): boolean {
  if (this.subscriptionTier === 'premium') return true;
  
  // Base users can see top 10 and bottom 10, plus unlocked slots
  if (position <= 10) return true; // Top 10
  if (position > this.stats.totalMoviesRanked - 10) return true; // Bottom 10
  if (position <= this.unlockedMovieSlots) return true; // Unlocked via referrals
  
  return false;
};

export const User = mongoose.model<IUser>('User', userSchema);