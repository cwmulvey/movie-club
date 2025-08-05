import { Request } from 'express';
import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: 'user' | 'moderator' | 'admin';
  profile: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  security: {
    emailVerified: boolean;
    emailVerificationOTP?: string;
    emailVerificationExpires?: Date;
    failedLoginAttempts: number;
    lockedUntil?: Date;
    passwordHistory: string[];
    lastPasswordChange?: Date;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
  };
  metadata: {
    lastLoginAt?: Date;
    lastLoginIP?: string;
    lastUserAgent?: string;
    isActive: boolean;
    deletedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  isLocked: boolean;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  isPasswordUsed(password: string): Promise<boolean>;
}

export interface IRefreshToken extends Document {
  token: string;
  userId: Types.ObjectId;
  deviceInfo: {
    userAgent?: string;
    ip?: string;
    deviceId?: string;
  };
  expiresAt: Date;
  createdAt: Date;
  
  isExpired(): boolean;
}

export interface IPasswordResetToken extends Document {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface ILoginActivity extends Document {
  userId: Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
  };
  loginSuccessful: boolean;
  failureReason?: string;
  createdAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  token?: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface DeviceInfo {
  userAgent?: string;
  ip?: string;
  deviceId?: string;
}