import mongoose, { Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types/auth.types';

export interface IUserDocument extends IUser, mongoose.Document {
  _id: Types.ObjectId;
}

const userSchema = new Schema<IUserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  passwordHash: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user',
    required: true
  },
  profile: {
    firstName: String,
    lastName: String,
    avatar: String
  },
  security: {
    emailVerified: { type: Boolean, default: false },
    emailVerificationOTP: String,
    emailVerificationExpires: Date,
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    passwordHistory: [String],
    lastPasswordChange: Date,
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String
  },
  metadata: {
    lastLoginAt: Date,
    lastLoginIP: String,
    lastUserAgent: String,
    isActive: { type: Boolean, default: true },
    deletedAt: Date
  },
}, {
  timestamps: true
});

// Virtual for isLocked
userSchema.virtual('isLocked').get(function() {
  return !!(this.security.lockedUntil && this.security.lockedUntil > new Date());
});

// Methods
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const user = await User.findById(this._id).select('+passwordHash');
  if (!user || !user.passwordHash) return false;
  return await bcrypt.compare(candidatePassword, user.passwordHash);
};

userSchema.methods.incrementLoginAttempts = async function(): Promise<void> {
  const updates: any = { $inc: { 'security.failedLoginAttempts': 1 } };
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours

  if (this.security.failedLoginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { 'security.lockedUntil': new Date(Date.now() + lockTime) };
  }

  await this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function(): Promise<void> {
  await this.updateOne({
    $set: { 'security.failedLoginAttempts': 0 },
    $unset: { 'security.lockedUntil': 1 }
  });
};

userSchema.methods.isPasswordUsed = async function(password: string): Promise<boolean> {
  if (!this.security.passwordHistory || this.security.passwordHistory.length === 0) {
    return false;
  }
  
  for (const oldHash of this.security.passwordHistory) {
    if (await bcrypt.compare(password, oldHash)) {
      return true;
    }
  }
  return false;
};

export const User = mongoose.model<IUserDocument>('User', userSchema);