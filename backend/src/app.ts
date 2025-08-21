import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
// Note: Express v5 has built-in async error handling

import config from './config/app.config';
import errorHandler from './middleware/errorHandler';
import redisClient from './config/redis';
import mongoose from 'mongoose';
import { searchMovies } from './services/tmdb.service';

const app: Application = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
app.use(cors({
  origin: config.app.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Compression
app.use(compression());

// Logging
if (config.app.env !== 'test') {
  app.use(morgan('combined'));
}

// Routes
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Movie Club API' });
});

// TMDB test endpoint
app.get('/api/test/tmdb/:query', async (req: Request, res: Response) => {
    try {
      const { query } = req.params;
      
      // Input validation
      if (!query || query.trim().length === 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Search query is required' 
        });
        return;
      }
      
      if (query.length > 100) {
        res.status(400).json({ 
          success: false, 
          error: 'Search query too long (max 100 characters)' 
        });
        return;
      }
      
      const results = await searchMovies(query.trim());
      res.json({
        success: true,
        query: query.trim(),
        totalResults: results.total_results,
        movies: results.results.slice(0, 5).map(movie => ({
          id: movie.id,
          title: movie.title,
          releaseDate: movie.release_date,
          posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : null
        }))
      });
    } catch (error: any) {
      console.error('TMDB endpoint error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to fetch movies from TMDB' 
      });
    }
  });

// Health check endpoint with TypeScript types
app.get('/api/health', async (_req, res) => {
  try {
    const healthcheck = {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      status: 'healthy' as const,
      checks: {
        database: mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy',
        redis: 'checking' as 'healthy' | 'unhealthy' | 'checking',
      },
    };

    // Check Redis (if configured)
    if (redisClient) {
      try {
        await redisClient.ping();
        healthcheck.checks.redis = 'healthy';
      } catch (error) {
        healthcheck.checks.redis = 'unhealthy';
        healthcheck.status = 'degraded' as any;
      }
    } else {
      healthcheck.checks.redis = 'healthy'; // No Redis configured is fine
    }

    // Overall status
    if (healthcheck.checks.database === 'unhealthy') {
      healthcheck.status = 'unhealthy' as any;
    }

    res.status(healthcheck.status === 'healthy' ? 200 : 503).json(healthcheck);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Routes
import authRoutes from './routes/auth.routes';

app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;