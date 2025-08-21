import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/auth.types';

export const generateAccessToken = (payload: JWTPayload): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    payload,
    secret,
    { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES || '15m' } as any
  );
};

export const generateRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT refresh secret is not configured');
  }

  return jwt.sign(
    { id: userId, type: 'refresh' },
    secret,
    { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES || '7d' } as any
  );
};

export const verifyToken = (token: string, isRefreshToken = false): JWTPayload => {
  const secret = isRefreshToken 
    ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
    : process.env.JWT_SECRET;
    
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }

  return jwt.verify(token, secret) as JWTPayload;
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
};