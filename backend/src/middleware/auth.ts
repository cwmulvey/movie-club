import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JWTPayload } from '../types/auth.types';
import { User } from '../models/User';

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('Auth middleware called for:', req.method, req.url);
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    console.log('Token present:', !!token);

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Access token is required'
        }
      });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not configured');
      res.status(500).json({
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'Authentication configuration error'
        }
      });
      return;
    }

    const decoded = jwt.verify(token, secret) as JWTPayload;
    
    const user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
      return;
    }

    if (!user.metadata.isActive) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive'
        }
      });
      return;
    }

    if (user.isLocked) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_LOCKED',
          message: 'User account is locked'
        }
      });
      return;
    }

    req.user = user as any;
    req.token = token;
    console.log('Auth successful, user set:', user._id);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired'
        }
      });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token'
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error'
      }
    });
  }
};

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not configured');
      next();
      return;
    }

    try {
      const decoded = jwt.verify(token, secret) as JWTPayload;
      const user = await User.findById(decoded.id).select('-passwordHash');
      
      if (user && user.metadata.isActive && !user.isLocked) {
        req.user = user as any;
        req.token = token;
      }
    } catch {
      // Invalid token, continue without authentication
    }
    
    next();
  } catch (error) {
    next();
  }
};