import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { searchMovies } from './services/tmdb.service';

const app: Application = express();

// Basic middleware
app.use(cors());
app.use(express.json());

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

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK' });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;