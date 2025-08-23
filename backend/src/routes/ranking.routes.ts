import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import { authenticateToken } from '../middleware/auth';
import { 
  comparisonEngine, 
  categoryManager, 
  ratingCalculator 
} from '../services/ranking';
import { UserRanking } from '../models/UserRanking';
import { Movie } from '../models/Movie';
import { AppError } from '../utils/AppError';
import mongoose from 'mongoose';
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

router.post('/start', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { tmdbId, category } = req.body;
    console.log('Ranking start request:', { tmdbId, category, tmdbIdType: typeof tmdbId });
    const userId = req.user!._id.toString();
    
    if (!tmdbId || !category) {
      throw new AppError('TMDB ID and category are required', 400, 'MISSING_PARAMETERS');
    }
    
    if (!categoryManager.isValidCategory(category)) {
      throw new AppError('Invalid category. Must be: liked, ok, or disliked', 400, 'INVALID_CATEGORY');
    }
    
    let movie = await Movie.findOne({ tmdbId });
    
    if (!movie) {
      // Automatically add movie to database
      try {
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
      } catch (tmdbError) {
        throw new AppError('Failed to fetch movie details from TMDB', 500, 'TMDB_ERROR');
      }
    }
    
    const session = await comparisonEngine.startComparisonSession(
      new mongoose.Types.ObjectId(userId),
      tmdbId,
      category
    );
    
    if (session.completed && session.finalPosition === 1) {
      const ranking = await comparisonEngine.completeRanking(session.id);
      
      res.json({
        status: 'completed',
        message: `This is your first "${category}" movie, so it's automatically ranked #1!`,
        ranking: {
          id: ranking._id,
          rankInCategory: ranking.rankInCategory,
          calculatedRating: ranking.calculatedRating,
          category: ranking.category
        }
      });
      return;
    }
    
    const remainingComparisons = session.state.searchRange.high - session.state.searchRange.low + 1;
    const estimatedComparisons = Math.ceil(Math.log2(remainingComparisons));
    
    res.json({
      status: 'in_progress',
      sessionId: session.id,
      comparison: session.currentComparison ? {
        movie1: {
          id: session.currentComparison.movie1._id,
          tmdbId: session.currentComparison.movie1.tmdbId,
          title: session.currentComparison.movie1.title,
          posterPath: session.currentComparison.movie1.posterPath,
          releaseDate: session.currentComparison.movie1.releaseDate
        },
        movie2: {
          id: session.currentComparison.movie2._id,
          tmdbId: session.currentComparison.movie2.tmdbId,
          title: session.currentComparison.movie2.title,
          posterPath: session.currentComparison.movie2.posterPath,
          releaseDate: session.currentComparison.movie2.releaseDate
        }
      } : null,
      estimatedRemainingComparisons: estimatedComparisons,
      completedComparisons: session.state.comparisons.length
    });
  } catch (error) {
    next(error);
  }
});

router.post('/compare', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { sessionId, preference } = req.body;
    const userId = req.user!._id.toString();
    
    if (!sessionId || !preference) {
      throw new AppError('Session ID and preference are required', 400, 'MISSING_PARAMETERS');
    }
    
    if (!['movie1', 'movie2', 'tie'].includes(preference)) {
      throw new AppError('Invalid preference. Must be: movie1, movie2, or tie', 400, 'INVALID_PREFERENCE');
    }
    
    const session = comparisonEngine.getSession(sessionId);
    
    if (!session) {
      throw new AppError('Session not found or expired', 404, 'SESSION_NOT_FOUND');
    }
    
    if (!session.userId.equals(new mongoose.Types.ObjectId(userId))) {
      throw new AppError('Unauthorized access to session', 403, 'UNAUTHORIZED');
    }
    
    const updatedSession = await comparisonEngine.submitComparison(
      sessionId,
      preference as 'movie1' | 'movie2' | 'tie'
    );
    
    if (updatedSession.completed) {
      const ranking = await comparisonEngine.completeRanking(sessionId);
      
      res.json({
        status: 'completed',
        message: `Movie ranked at position #${ranking.rankInCategory} in "${ranking.category}" category`,
        ranking: {
          id: ranking._id,
          rankInCategory: ranking.rankInCategory,
          calculatedRating: ranking.calculatedRating,
          category: ranking.category
        }
      });
      return;
    }
    
    const remainingComparisons = updatedSession.state.searchRange.high - 
                                updatedSession.state.searchRange.low + 1;
    const estimatedComparisons = Math.ceil(Math.log2(remainingComparisons));
    
    res.json({
      status: 'in_progress',
      sessionId: updatedSession.id,
      comparison: updatedSession.currentComparison ? {
        movie1: {
          id: updatedSession.currentComparison.movie1._id,
          tmdbId: updatedSession.currentComparison.movie1.tmdbId,
          title: updatedSession.currentComparison.movie1.title,
          posterPath: updatedSession.currentComparison.movie1.posterPath,
          releaseDate: updatedSession.currentComparison.movie1.releaseDate
        },
        movie2: {
          id: updatedSession.currentComparison.movie2._id,
          tmdbId: updatedSession.currentComparison.movie2.tmdbId,
          title: updatedSession.currentComparison.movie2.title,
          posterPath: updatedSession.currentComparison.movie2.posterPath,
          releaseDate: updatedSession.currentComparison.movie2.releaseDate
        }
      } : null,
      estimatedRemainingComparisons: estimatedComparisons,
      completedComparisons: updatedSession.state.comparisons.length
    });
  } catch (error) {
    next(error);
  }
});

router.get('/user', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const targetUserId = req.user!._id.toString();
    const requestingUserId = req.user!._id.toString();
    
    const isOwnRankings = targetUserId === requestingUserId;
    
    const query: any = {
      userId: new mongoose.Types.ObjectId(targetUserId)
    };
    
    if (!isOwnRankings) {
      query.isPublic = true;
    }
    
    const rankings = await UserRanking.find(query)
      .populate('movieId')
      .sort({ category: 1, rankInCategory: 1 });
    
    const categorizedRankings = {
      liked: [] as any[],
      ok: [] as any[],
      disliked: [] as any[]
    };
    
    rankings.forEach(ranking => {
      const movie = ranking.movieId as any;
      categorizedRankings[ranking.category].push({
        id: ranking._id,
        rank: ranking.rankInCategory,
        rating: ranking.calculatedRating,
        movie: {
          id: movie._id,
          tmdbId: movie.tmdbId,
          title: movie.title,
          posterPath: movie.posterPath,
          releaseDate: movie.releaseDate,
          runtime: movie.runtime,
          genres: movie.genres
        },
        notes: ranking.notes,
        tags: ranking.tags,
        watchDate: ranking.watchDate,
        rewatchable: ranking.rewatchable,
        rankingDate: ranking.rankingDate,
        isPublic: ranking.isPublic
      });
    });
    
    res.json({
      userId: targetUserId,
      isOwnRankings,
      rankings: categorizedRankings,
      stats: {
        total: rankings.length,
        liked: categorizedRankings.liked.length,
        ok: categorizedRankings.ok.length,
        disliked: categorizedRankings.disliked.length
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/user/:userId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const targetUserId = req.params.userId;
    const requestingUserId = req.user!._id.toString();
    
    const isOwnRankings = targetUserId === requestingUserId;
    
    const query: any = {
      userId: new mongoose.Types.ObjectId(targetUserId)
    };
    
    if (!isOwnRankings) {
      query.isPublic = true;
    }
    
    const rankings = await UserRanking.find(query)
      .populate('movieId')
      .sort({ category: 1, rankInCategory: 1 });
    
    const categorizedRankings = {
      liked: [] as any[],
      ok: [] as any[],
      disliked: [] as any[]
    };
    
    rankings.forEach(ranking => {
      const movie = ranking.movieId as any;
      categorizedRankings[ranking.category].push({
        id: ranking._id,
        rank: ranking.rankInCategory,
        rating: ranking.calculatedRating,
        movie: {
          id: movie._id,
          tmdbId: movie.tmdbId,
          title: movie.title,
          posterPath: movie.posterPath,
          releaseDate: movie.releaseDate,
          runtime: movie.runtime,
          genres: movie.genres
        },
        notes: ranking.notes,
        tags: ranking.tags,
        watchDate: ranking.watchDate,
        rewatchable: ranking.rewatchable,
        rankingDate: ranking.rankingDate,
        isPublic: ranking.isPublic
      });
    });
    
    res.json({
      userId: targetUserId,
      isOwnRankings,
      rankings: categorizedRankings,
      stats: {
        total: rankings.length,
        liked: categorizedRankings.liked.length,
        ok: categorizedRankings.ok.length,
        disliked: categorizedRankings.disliked.length
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/category/:category', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { category } = req.params;
    const userId = req.user!._id.toString();
    
    if (!categoryManager.isValidCategory(category)) {
      throw new AppError('Invalid category', 400, 'INVALID_CATEGORY');
    }
    
    const rankings = await UserRanking.find({
      userId: new mongoose.Types.ObjectId(userId),
      category
    })
    .populate('movieId')
    .sort({ rankInCategory: 1 });
    
    const formattedRankings = rankings.map(ranking => {
      const movie = ranking.movieId as any;
      return {
        id: ranking._id,
        rank: ranking.rankInCategory,
        rating: ranking.calculatedRating,
        movie: {
          id: movie._id,
          tmdbId: movie.tmdbId,
          title: movie.title,
          posterPath: movie.posterPath,
          releaseDate: movie.releaseDate
        },
        notes: ranking.notes,
        tags: ranking.tags,
        watchDate: ranking.watchDate,
        rewatchable: ranking.rewatchable,
        rankingDate: ranking.rankingDate
      };
    });
    
    res.json({
      category,
      rankings: formattedRankings,
      count: rankings.length,
      ratingRange: categoryManager.getCategoryRange(category as any)
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:rankingId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { rankingId } = req.params;
    const userId = req.user!._id.toString();
    const updates = req.body;
    
    const ranking = await UserRanking.findOne({
      _id: rankingId,
      userId: new mongoose.Types.ObjectId(userId)
    });
    
    if (!ranking) {
      throw new AppError('Ranking not found', 404, 'RANKING_NOT_FOUND');
    }
    
    const allowedUpdates = ['notes', 'tags', 'watchDate', 'rewatchable', 'isPublic'];
    const updateFields: any = {};
    
    for (const field of allowedUpdates) {
      if (field in updates) {
        updateFields[field] = updates[field];
      }
    }
    
    if (updates.category && updates.category !== ranking.category) {
      if (!categoryManager.isValidCategory(updates.category)) {
        throw new AppError('Invalid category', 400, 'INVALID_CATEGORY');
      }
      
      await categoryManager.moveToCategory(
        ranking._id as mongoose.Types.ObjectId,
        updates.category as any
      );
      
      await ratingCalculator.recalculateRatingsForCategory(
        new mongoose.Types.ObjectId(userId),
        ranking.category
      );
      await ratingCalculator.recalculateRatingsForCategory(
        new mongoose.Types.ObjectId(userId),
        updates.category
      );
    }
    
    Object.assign(ranking, updateFields);
    await ranking.save();
    
    res.json({
      message: 'Ranking updated successfully',
      ranking: {
        id: ranking._id,
        category: ranking.category,
        rankInCategory: ranking.rankInCategory,
        calculatedRating: ranking.calculatedRating,
        notes: ranking.notes,
        tags: ranking.tags,
        watchDate: ranking.watchDate,
        rewatchable: ranking.rewatchable,
        isPublic: ranking.isPublic
      }
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:rankingId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { rankingId } = req.params;
    const userId = req.user!._id.toString();
    
    const ranking = await UserRanking.findOne({
      _id: rankingId,
      userId: new mongoose.Types.ObjectId(userId)
    });
    
    if (!ranking) {
      throw new AppError('Ranking not found', 404, 'RANKING_NOT_FOUND');
    }
    
    const category = ranking.category;
    const rankInCategory = ranking.rankInCategory;
    
    await ranking.deleteOne();
    
    await categoryManager.shiftRankingsUp(
      new mongoose.Types.ObjectId(userId),
      category,
      rankInCategory
    );
    
    await ratingCalculator.recalculateRatingsForCategory(
      new mongoose.Types.ObjectId(userId),
      category
    );
    
    res.json({
      message: 'Ranking deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/cancel/:sessionId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!._id.toString();
    
    const session = comparisonEngine.getSession(sessionId);
    
    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }
    
    if (!session.userId.equals(new mongoose.Types.ObjectId(userId))) {
      throw new AppError('Unauthorized access to session', 403, 'UNAUTHORIZED');
    }
    
    comparisonEngine.cancelSession(sessionId);
    
    res.json({
      message: 'Ranking session cancelled'
    });
  } catch (error) {
    next(error);
  }
});

export default router;