import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { Movie } from '../models/Movie';
import { UserRanking } from '../models/UserRanking';
import { searchMovies } from '../services/tmdb.service';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../types/auth.types';
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

// Test endpoint without auth
router.get('/test', (_req: Request, res: Response) => {
  console.log('Test endpoint called - server is working');
  res.json({ success: true, message: 'Movie routes are working', timestamp: new Date().toISOString() });
});

// Simple test endpoint with auth to verify basic functionality
router.get('/simple-test', async (_req: Request, res: Response) => {
  console.log('Simple test endpoint called');
  try {
    console.log('About to return simple response');
    res.json({ success: true, message: 'Authenticated endpoint working' });
  } catch (error) {
    console.error('Error in simple-test:', error);
    res.status(500).json({ error: 'Simple test failed' });
  }
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

router.get('/trending', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { timeWindow = 'week' } = req.query;
    console.log('Trending movies endpoint called with timeWindow:', timeWindow);
    
    if (!['day', 'week'].includes(timeWindow as string)) {
      throw new AppError('Invalid time window. Must be: day or week', 400, 'INVALID_TIME_WINDOW');
    }
    
    const trendingResponse = await tmdbApi.get(`/trending/movie/${timeWindow}`);
    const trending = trendingResponse.data;
    
    const validMovies = trending.results.filter((tmdbMovie: any) => {
      const isValid = tmdbMovie.id && !isNaN(tmdbMovie.id) && tmdbMovie.id > 0;
      if (!isValid) {
        console.log('Filtering out invalid trending movie:', { id: tmdbMovie.id, title: tmdbMovie.title });
      }
      return isValid;
    });
    
    console.log(`Processing ${validMovies.length} valid trending movies out of ${trending.results.length} total`);
    
    const moviesWithStatus = await Promise.all(
      validMovies.map(async (tmdbMovie: any) => {
        const existingMovie = await Movie.findOne({ tmdbId: tmdbMovie.id });
        
        // Check if current user has ranked this movie
        let userRanking = null;
        if (req.user) {
          userRanking = await UserRanking.findOne({ 
            userId: req.user.id,
            tmdbId: tmdbMovie.id 
          });
        }
        
        return {
          tmdbId: tmdbMovie.id,
          title: tmdbMovie.title,
          overview: tmdbMovie.overview,
          posterPath: tmdbMovie.poster_path,
          releaseDate: tmdbMovie.release_date,
          voteAverage: tmdbMovie.vote_average,
          popularity: tmdbMovie.popularity,
          inDatabase: !!existingMovie,
          appStats: existingMovie ? existingMovie.appStats : null,
          userRanking: userRanking ? {
            rating: userRanking.calculatedRating,
            category: userRanking.category,
            rankInCategory: userRanking.rankInCategory,
            rankingDate: userRanking.rankingDate
          } : null
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

// Popular movies endpoint
router.get('/popular', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log('Popular movies endpoint called');
    console.log('TMDB_API_KEY present:', !!TMDB_API_KEY);
    
    const popularResponse = await tmdbApi.get('/movie/popular');
    console.log('TMDB response received, results count:', popularResponse.data.results?.length);
    
    const popular = popularResponse.data;
    
    const validMovies = popular.results.filter((tmdbMovie: any) => {
      const isValid = tmdbMovie.id && !isNaN(tmdbMovie.id) && tmdbMovie.id > 0;
      if (!isValid) {
        console.log('Filtering out invalid movie:', { id: tmdbMovie.id, title: tmdbMovie.title });
      }
      return isValid;
    });
    
    console.log(`Processing ${validMovies.length} valid movies out of ${popular.results.length} total`);
    
    const moviesWithStatus = await Promise.all(
      validMovies.map(async (tmdbMovie: any) => {
          const existingMovie = await Movie.findOne({ tmdbId: tmdbMovie.id });
          
          // Check if current user has ranked this movie
          let userRanking = null;
          if (req.user) {
            userRanking = await UserRanking.findOne({ 
              userId: req.user.id,
              tmdbId: tmdbMovie.id 
            });
          }
          
          return {
            tmdbId: tmdbMovie.id,
            title: tmdbMovie.title,
            overview: tmdbMovie.overview,
            posterPath: tmdbMovie.poster_path,
            backdropPath: tmdbMovie.backdrop_path,
            releaseDate: tmdbMovie.release_date,
            voteAverage: tmdbMovie.vote_average,
            popularity: tmdbMovie.popularity,
            inDatabase: !!existingMovie,
            appStats: existingMovie ? existingMovie.appStats : null,
            userRanking: userRanking ? {
              rating: userRanking.calculatedRating,
              category: userRanking.category,
              rankInCategory: userRanking.rankInCategory,
              rankingDate: userRanking.rankingDate
            } : null
          };
        })
    );
    
    console.log('Movies processed, sending response');
    res.json({
      results: moviesWithStatus
    });
  } catch (error) {
    console.error('Popular movies endpoint error:', error);
    next(error);
  }
});

// Now playing movies endpoint  
router.get('/now-playing', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const nowPlayingResponse = await tmdbApi.get('/movie/now_playing');
    const nowPlaying = nowPlayingResponse.data;
    
    const moviesWithStatus = await Promise.all(
      nowPlaying.results
        .filter((tmdbMovie: any) => tmdbMovie.id && !isNaN(tmdbMovie.id))
        .map(async (tmdbMovie: any) => {
        const existingMovie = await Movie.findOne({ tmdbId: tmdbMovie.id });
        
        // Check if current user has ranked this movie
        let userRanking = null;
        if (req.user) {
          userRanking = await UserRanking.findOne({ 
            userId: req.user.id,
            tmdbId: tmdbMovie.id 
          });
        }
        
        return {
          tmdbId: tmdbMovie.id,
          title: tmdbMovie.title,
          overview: tmdbMovie.overview,
          posterPath: tmdbMovie.poster_path,
          backdropPath: tmdbMovie.backdrop_path,
          releaseDate: tmdbMovie.release_date,
          voteAverage: tmdbMovie.vote_average,
          popularity: tmdbMovie.popularity,
          inDatabase: !!existingMovie,
          appStats: existingMovie ? existingMovie.appStats : null,
          userRanking: userRanking ? {
            rating: userRanking.calculatedRating,
            category: userRanking.category,
            rankInCategory: userRanking.rankInCategory,
            rankingDate: userRanking.rankingDate
          } : null
        };
      })
    );
    
    res.json({
      results: moviesWithStatus
    });
  } catch (error) {
    next(error);
  }
});

// Upcoming movies endpoint
router.get('/upcoming', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const upcomingResponse = await tmdbApi.get('/movie/upcoming');
    const upcoming = upcomingResponse.data;
    
    const moviesWithStatus = await Promise.all(
      upcoming.results
        .filter((tmdbMovie: any) => tmdbMovie.id && !isNaN(tmdbMovie.id))
        .map(async (tmdbMovie: any) => {
        const existingMovie = await Movie.findOne({ tmdbId: tmdbMovie.id });
        
        // Check if current user has ranked this movie
        let userRanking = null;
        if (req.user) {
          userRanking = await UserRanking.findOne({ 
            userId: req.user.id,
            tmdbId: tmdbMovie.id 
          });
        }
        
        return {
          tmdbId: tmdbMovie.id,
          title: tmdbMovie.title,
          overview: tmdbMovie.overview,
          posterPath: tmdbMovie.poster_path,
          backdropPath: tmdbMovie.backdrop_path,
          releaseDate: tmdbMovie.release_date,
          voteAverage: tmdbMovie.vote_average,
          popularity: tmdbMovie.popularity,
          inDatabase: !!existingMovie,
          appStats: existingMovie ? existingMovie.appStats : null,
          userRanking: userRanking ? {
            rating: userRanking.calculatedRating,
            category: userRanking.category,
            rankInCategory: userRanking.rankInCategory,
            rankingDate: userRanking.rankingDate
          } : null
        };
      })
    );
    
    res.json({
      results: moviesWithStatus
    });
  } catch (error) {
    next(error);
  }
});

// Top rated movies by users endpoint
router.get('/top-rated-by-users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Get movies ordered by average rating from our users, with minimum 3 rankings
    const topRatedMovies = await Movie.find({
      'appStats.totalRankings': { $gte: 3 }
    })
    .sort({ 'appStats.averageRating': -1 })
    .limit(20);
    
    const moviesWithStatus = topRatedMovies.map((movie) => ({
      tmdbId: movie.tmdbId,
      title: movie.title,
      overview: movie.overview,
      posterPath: movie.posterPath,
      backdropPath: movie.backdropPath,
      releaseDate: movie.releaseDate,
      voteAverage: movie.tmdbVoteAverage || 0,
      popularity: movie.tmdbPopularity || 0,
      inDatabase: true,
      appStats: movie.appStats
    }));
    
    res.json({
      results: moviesWithStatus
    });
  } catch (error) {
    next(error);
  }
});

// Decade-based movie endpoints
router.get('/decade/:decade', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { decade } = req.params;
    
    // Map decade to year ranges
    const decadeRanges: { [key: string]: { start: number; end: number } } = {
      '2020s': { start: 2020, end: 2029 },
      '2010s': { start: 2010, end: 2019 },
      '2000s': { start: 2000, end: 2009 },
      '1990s': { start: 1990, end: 1999 },
      '1980s': { start: 1980, end: 1989 }
    };
    
    const range = decadeRanges[decade];
    if (!range) {
      throw new AppError('Invalid decade. Supported: 2020s, 2010s, 2000s, 1990s, 1980s', 400, 'INVALID_DECADE');
    }
    
    // Use TMDB discover to find top-rated movies from the decade
    const discoverResponse = await tmdbApi.get('/discover/movie', {
      params: {
        sort_by: 'vote_average.desc',
        'vote_count.gte': 1000, // Minimum votes for mainstream movies
        'primary_release_date.gte': `${range.start}-01-01`,
        'primary_release_date.lte': `${range.end}-12-31`,
        page: 1
      }
    });
    
    const movies = discoverResponse.data;
    
    const moviesWithStatus = await Promise.all(
      movies.results
        .filter((tmdbMovie: any) => tmdbMovie.id && !isNaN(tmdbMovie.id))
        .slice(0, 20)
        .map(async (tmdbMovie: any) => {
        const existingMovie = await Movie.findOne({ tmdbId: tmdbMovie.id });
        
        // Check if current user has ranked this movie
        let userRanking = null;
        if (req.user) {
          userRanking = await UserRanking.findOne({ 
            userId: req.user.id,
            tmdbId: tmdbMovie.id 
          });
        }
        
        return {
          tmdbId: tmdbMovie.id,
          title: tmdbMovie.title,
          overview: tmdbMovie.overview,
          posterPath: tmdbMovie.poster_path,
          backdropPath: tmdbMovie.backdrop_path,
          releaseDate: tmdbMovie.release_date,
          voteAverage: tmdbMovie.vote_average,
          popularity: tmdbMovie.popularity,
          inDatabase: !!existingMovie,
          appStats: existingMovie ? existingMovie.appStats : null,
          userRanking: userRanking ? {
            rating: userRanking.calculatedRating,
            category: userRanking.category,
            rankInCategory: userRanking.rankInCategory,
            rankingDate: userRanking.rankingDate
          } : null
        };
      })
    );
    
    res.json({
      decade,
      results: moviesWithStatus
    });
  } catch (error) {
    next(error);
  }
});

// IMPORTANT: Keep this route at the end - it's a catch-all for numeric IDs
router.get('/:tmdbId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { tmdbId } = req.params;
    console.log('Movie detail endpoint called with tmdbId:', tmdbId);
    
    // Validate tmdbId is a valid number
    const numericTmdbId = Number(tmdbId);
    if (isNaN(numericTmdbId) || numericTmdbId <= 0) {
      console.log('Invalid tmdbId provided:', tmdbId);
      throw new AppError('Invalid movie ID', 400, 'INVALID_MOVIE_ID');
    }
    
    let movie = await Movie.findOne({ tmdbId: numericTmdbId });
    
    // Always fetch TMDB data for additional details
    const [tmdbMovieResponse, creditsResponse] = await Promise.all([
      tmdbApi.get(`/movie/${tmdbId}`),
      tmdbApi.get(`/movie/${tmdbId}/credits`)
    ]);
    
    const tmdbMovie = tmdbMovieResponse.data;
    const credits = creditsResponse.data;
    
    // Create movie object (but don't save to database unless it's already there)
    const movieData = {
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
      tmdbPopularity: tmdbMovie.popularity,
      // Default appStats for new movies (not saved to database)
      appStats: movie?.appStats || {
        totalRankings: 0,
        averageRating: 0,
        likedCount: 0,
        okCount: 0,
        dislikedCount: 0,
        lastUpdated: new Date()
      }
    };
    
    // Use existing database movie if available, otherwise use TMDB data
    const finalMovieData = movie ? {
      ...movieData,
      id: movie._id,
      appStats: movie.appStats
    } : movieData;
    
    // Fetch additional data
    let additionalData: any = {};
    try {
      const [watchProvidersResponse, externalIdsResponse] = await Promise.all([
        tmdbApi.get(`/movie/${numericTmdbId}/watch/providers`).catch(() => ({ data: { results: {} } })),
        tmdbApi.get(`/movie/${numericTmdbId}/external_ids`).catch(() => ({ data: {} }))
      ]);
      
      additionalData = {
        watchProviders: watchProvidersResponse.data.results?.US || {},
        externalIds: externalIdsResponse.data,
        budget: tmdbMovie.budget,
        revenue: tmdbMovie.revenue,
        tagline: tmdbMovie.tagline,
        homepage: tmdbMovie.homepage,
        productionCompanies: tmdbMovie.production_companies?.map((c: any) => c.name) || []
      };
    } catch (error) {
      console.error('Error fetching additional data:', error);
    }
    
    // Check if user has ranked this movie
    let userRanking = null;
    if (req.user) {
      console.log(`Looking for UserRanking with userId: ${req.user.id}, tmdbId: ${numericTmdbId}`);
      userRanking = await UserRanking.findOne({ 
        userId: req.user.id,
        tmdbId: numericTmdbId 
      });
      console.log('UserRanking found:', userRanking ? `Rating: ${userRanking.calculatedRating}, Category: ${userRanking.category}` : 'No ranking found');
    }
    
    res.json({
      ...finalMovieData,
      ...additionalData,
      userRanking: userRanking ? {
        rating: userRanking.calculatedRating,
        category: userRanking.category,
        rankInCategory: userRanking.rankInCategory,
        rankingDate: userRanking.rankingDate
      } : null
    });
  } catch (error) {
    next(error);
  }
});

export default router;