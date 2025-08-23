import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { Movie } from '../models/Movie';
import { searchMovies } from '../services/tmdb.service';
import { AppError } from '../utils/AppError';
import axios from 'axios';

const router = Router();

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
  },
});

router.use(authenticateToken);

router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      throw new AppError('Search query is required', 400, 'MISSING_QUERY');
    }
    
    const results = await searchMovies(query);
    
    const moviesWithStatus = await Promise.all(
      results.results.map(async (tmdbMovie: any) => {
        const existingMovie = await Movie.findOne({ tmdbId: tmdbMovie.id });
        
        return {
          tmdbId: tmdbMovie.id,
          title: tmdbMovie.title,
          overview: tmdbMovie.overview,
          posterPath: tmdbMovie.poster_path,
          backdropPath: tmdbMovie.backdrop_path,
          releaseDate: tmdbMovie.release_date,
          voteAverage: tmdbMovie.vote_average,
          voteCount: tmdbMovie.vote_count,
          popularity: tmdbMovie.popularity,
          inDatabase: !!existingMovie,
          appStats: existingMovie ? existingMovie.appStats : null
        };
      })
    );
    
    res.json({
      page: results.page || 1,
      totalPages: results.total_pages || 1,
      totalResults: results.total_results || 0,
      results: moviesWithStatus
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:tmdbId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tmdbId } = req.params;
    
    let movie = await Movie.findOne({ tmdbId: Number(tmdbId) });
    
    if (!movie) {
      const [tmdbMovieResponse, creditsResponse] = await Promise.all([
        tmdbApi.get(`/movie/${tmdbId}`),
        tmdbApi.get(`/movie/${tmdbId}/credits`)
      ]);
      
      const tmdbMovie = tmdbMovieResponse.data;
      const credits = creditsResponse.data;
      
      movie = new Movie({
        tmdbId: tmdbMovie.id,
        title: tmdbMovie.title,
        overview: tmdbMovie.overview,
        posterPath: tmdbMovie.poster_path,
        backdropPath: tmdbMovie.backdrop_path,
        releaseDate: tmdbMovie.release_date ? new Date(tmdbMovie.release_date) : undefined,
        runtime: tmdbMovie.runtime,
        genres: tmdbMovie.genres.map((g: any) => g.name),
        directors: credits.crew
          .filter((c: any) => c.job === 'Director')
          .map((d: any) => d.name),
        cast: credits.cast
          .slice(0, 10)
          .map((c: any) => c.name),
        tmdbVoteAverage: tmdbMovie.vote_average,
        tmdbVoteCount: tmdbMovie.vote_count,
        tmdbPopularity: tmdbMovie.popularity
      });
      
      await movie.save();
    }
    
    res.json({
      id: movie._id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      overview: movie.overview,
      posterPath: movie.posterPath,
      backdropPath: movie.backdropPath,
      releaseDate: movie.releaseDate,
      runtime: movie.runtime,
      genres: movie.genres,
      directors: movie.directors,
      cast: movie.cast,
      tmdbVoteAverage: movie.tmdbVoteAverage,
      tmdbVoteCount: movie.tmdbVoteCount,
      tmdbPopularity: movie.tmdbPopularity,
      appStats: movie.appStats
    });
  } catch (error) {
    next(error);
  }
});

router.post('/add', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tmdbId } = req.body;
    
    if (!tmdbId) {
      throw new AppError('TMDB ID is required', 400, 'MISSING_TMDB_ID');
    }
    
    let movie = await Movie.findOne({ tmdbId });
    
    if (movie) {
      res.json({
        message: 'Movie already in database',
        movie: {
          id: movie._id,
          tmdbId: movie.tmdbId,
          title: movie.title
        }
      });
      return;
    }
    
    const [tmdbMovieResponse, creditsResponse] = await Promise.all([
      tmdbApi.get(`/movie/${tmdbId}`),
      tmdbApi.get(`/movie/${tmdbId}/credits`)
    ]);
    
    const tmdbMovie = tmdbMovieResponse.data;
    const credits = creditsResponse.data;
    
    movie = new Movie({
      tmdbId: tmdbMovie.id,
      title: tmdbMovie.title,
      overview: tmdbMovie.overview,
      posterPath: tmdbMovie.poster_path,
      backdropPath: tmdbMovie.backdrop_path,
      releaseDate: tmdbMovie.release_date ? new Date(tmdbMovie.release_date) : undefined,
      runtime: tmdbMovie.runtime,
      genres: tmdbMovie.genres.map((g: any) => g.name),
      directors: credits.crew
        .filter((c: any) => c.job === 'Director')
        .map((d: any) => d.name),
      cast: credits.cast
        .slice(0, 10)
        .map((c: any) => c.name),
      tmdbVoteAverage: tmdbMovie.vote_average,
      tmdbVoteCount: tmdbMovie.vote_count,
      tmdbPopularity: tmdbMovie.popularity
    });
    
    await movie.save();
    
    res.status(201).json({
      message: 'Movie added successfully',
      movie: {
        id: movie._id,
        tmdbId: movie.tmdbId,
        title: movie.title,
        posterPath: movie.posterPath
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/popular/week', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const movies = await Movie.find({
      'appStats.lastUpdated': {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    })
    .sort({ 'appStats.totalRankings': -1 })
    .limit(10);
    
    res.json({
      period: 'week',
      movies: movies.map(movie => ({
        id: movie._id,
        tmdbId: movie.tmdbId,
        title: movie.title,
        posterPath: movie.posterPath,
        appStats: movie.appStats
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get('/trending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { timeWindow = 'week' } = req.query;
    
    if (!['day', 'week'].includes(timeWindow as string)) {
      throw new AppError('Invalid time window. Must be: day or week', 400, 'INVALID_TIME_WINDOW');
    }
    
    const trendingResponse = await tmdbApi.get(`/trending/movie/${timeWindow}`);
    const trending = trendingResponse.data;
    
    const moviesWithStatus = await Promise.all(
      trending.results.map(async (tmdbMovie: any) => {
        const existingMovie = await Movie.findOne({ tmdbId: tmdbMovie.id });
        
        return {
          tmdbId: tmdbMovie.id,
          title: tmdbMovie.title,
          overview: tmdbMovie.overview,
          posterPath: tmdbMovie.poster_path,
          releaseDate: tmdbMovie.release_date,
          voteAverage: tmdbMovie.vote_average,
          popularity: tmdbMovie.popularity,
          inDatabase: !!existingMovie,
          appStats: existingMovie ? existingMovie.appStats : null
        };
      })
    );
    
    res.json({
      timeWindow,
      results: moviesWithStatus
    });
  } catch (error) {
    next(error);
  }
});

export default router;