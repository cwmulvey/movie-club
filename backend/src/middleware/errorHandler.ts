import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/response.types';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  keyPattern?: Record<string, any>;
  errors?: any;
}

const errorHandler = (
  err: CustomError,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void => {
  console.error('Error:', err);

  // Default error
  let statusCode = 500;
  let error = {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  };

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    error = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: Object.values(err.errors || {}).map((e: any) => ({
        field: e.path,
        message: e.message,
      })),
    } as any;
  }

  // Mongoose duplicate key error
  if ((err as any).code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    statusCode = 409;
    error = {
      code: 'DUPLICATE_ERROR',
      message: `${field} already exists`,
      field,
    } as any;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    error = {
      code: 'AUTH_TOKEN_INVALID',
      message: 'Invalid token',
    };
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    error = {
      code: 'AUTH_TOKEN_EXPIRED',
      message: 'Token expired',
    };
  }

  // Custom application errors
  if (err.statusCode) {
    statusCode = err.statusCode;
    error = {
      code: err.code || 'ERROR',
      message: err.message,
    };
  }

  // Send response
  res.status(statusCode).json({ success: false, error });
};

export default errorHandler;