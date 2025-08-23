import { UserRanking, IRanking } from '../../models/UserRanking';
import { Movie, IMovie } from '../../models/Movie';
import mongoose from 'mongoose';
import rankingAlgorithm, { BinarySearchState, ComparisonResult } from './rankingAlgorithm';
import categoryManager, { Category } from './categoryManager';
import ratingCalculator from './ratingCalculator';
import rankingCache from '../cache/rankingCache';
import rankingQueue from '../queue/rankingQueue';

export interface ComparisonSession {
  id: string;
  userId: mongoose.Types.ObjectId;
  newMovie: {
    tmdbId: number;
    movieId?: mongoose.Types.ObjectId;
  };
  category: Category;
  state: BinarySearchState;
  currentComparison?: {
    movie1: IMovie;
    movie2: IMovie;
  };
  completed: boolean;
  finalPosition?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ComparisonEngine {
  private sessions: Map<string, ComparisonSession> = new Map();
  
  async startComparisonSession(
    userId: mongoose.Types.ObjectId,
    tmdbId: number,
    category: Category
  ): Promise<ComparisonSession> {
    const sessionId = this.generateSessionId(userId, tmdbId);
    
    const movie = await Movie.findOne({ tmdbId });
    if (!movie) {
      throw new Error('Movie not found in database');
    }
    
    const existingRanking = await UserRanking.findOne({
      userId,
      movieId: movie._id
    });
    
    if (existingRanking) {
      throw new Error('Movie already ranked by user');
    }
    
    const existingRankings = await categoryManager.getRankingsInCategory(userId, category);
    
    if (existingRankings.length === 0) {
      const session: ComparisonSession = {
        id: sessionId,
        userId,
        newMovie: { tmdbId, movieId: movie._id as mongoose.Types.ObjectId },
        category,
        state: {
          category,
          userId,
          newMovieId: movie._id as mongoose.Types.ObjectId,
          searchRange: { low: 1, high: 1 },
          comparisons: []
        },
        completed: true,
        finalPosition: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.sessions.set(sessionId, session);
      return session;
    }
    
    const state: BinarySearchState = {
      category,
      userId,
      newMovieId: movie._id as mongoose.Types.ObjectId,
      searchRange: { low: 1, high: existingRankings.length },
      comparisons: []
    };
    
    const session: ComparisonSession = {
      id: sessionId,
      userId,
      newMovie: { tmdbId, movieId: movie._id as mongoose.Types.ObjectId },
      category,
      state,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.sessions.set(sessionId, session);
    rankingCache.setSessionData(sessionId, session);
    
    await this.prepareNextComparison(session);
    
    return session;
  }
  
  async prepareNextComparison(session: ComparisonSession): Promise<void> {
    const existingRankings = await categoryManager.getRankingsInCategory(
      session.userId,
      session.category
    );
    
    const result = await rankingAlgorithm.findInsertionPosition(
      session.state,
      existingRankings
    );
    
    if (result.finalPosition !== undefined) {
      session.completed = true;
      session.finalPosition = result.finalPosition;
      session.updatedAt = new Date();
      return;
    }
    
    if (result.movieToCompare) {
      const [newMovie, comparisonMovie] = await Promise.all([
        Movie.findById(session.newMovie.movieId),
        Movie.findById(result.movieToCompare.movieId)
      ]);
      
      if (!newMovie || !comparisonMovie) {
        throw new Error('Movie not found for comparison');
      }
      
      session.currentComparison = {
        movie1: newMovie,
        movie2: comparisonMovie
      };
      session.state.currentComparisonIndex = result.movieToCompare.rankInCategory;
      session.updatedAt = new Date();
    }
  }
  
  async submitComparison(
    sessionId: string,
    winner: 'movie1' | 'movie2' | 'tie'
  ): Promise<ComparisonSession> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (session.completed) {
      throw new Error('Session already completed');
    }
    
    if (!session.currentComparison) {
      throw new Error('No comparison available');
    }
    
    const comparisonResult: ComparisonResult = {
      winner: winner === 'movie1' ? 'new' : winner === 'movie2' ? 'existing' : 'tie',
      newMovieId: session.newMovie.movieId!,
      existingMovieId: session.currentComparison.movie2._id as mongoose.Types.ObjectId
    };
    
    session.state = rankingAlgorithm.processComparisonResult(
      session.state,
      comparisonResult
    );
    
    await this.prepareNextComparison(session);
    
    this.sessions.set(sessionId, session);
    rankingCache.setSessionData(sessionId, session);
    
    return session;
  }
  
  async completeRanking(sessionId: string): Promise<IRanking> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (!session.completed || !session.finalPosition) {
      throw new Error('Session not completed');
    }
    
    await categoryManager.shiftRankingsDown(
      session.userId,
      session.category,
      session.finalPosition
    );
    
    const movie = await Movie.findById(session.newMovie.movieId);
    if (!movie) {
      throw new Error('Movie not found');
    }
    
    const totalInCategory = await categoryManager.getMovieCountInCategory(
      session.userId,
      session.category
    ) + 1;
    
    const calculatedRating = ratingCalculator.calculateRating(
      session.finalPosition,
      totalInCategory,
      session.category
    );
    
    const newRanking = new UserRanking({
      userId: session.userId,
      movieId: session.newMovie.movieId,
      tmdbId: session.newMovie.tmdbId,
      category: session.category,
      rankInCategory: session.finalPosition,
      calculatedRating,
      comparisonHistory: {
        wonAgainst: session.state.comparisons
          .filter(c => c.winner === 'new')
          .map(c => c.existingMovieId),
        lostTo: session.state.comparisons
          .filter(c => c.winner === 'existing')
          .map(c => c.existingMovieId),
        tiedWith: session.state.comparisons
          .filter(c => c.winner === 'tie')
          .map(c => c.existingMovieId)
      },
      isPublic: true,
      rankingDate: new Date()
    });
    
    await newRanking.save();
    
    // Immediately recalculate ratings for ALL movies in category (synchronous)
    // This is necessary because the total count affects the rating formula for all movies
    await ratingCalculator.recalculateRatingsForCategory(
      session.userId,
      session.category
    );
    
    // Queue movie stats update (can be async)
    await rankingQueue.queueMovieStatsUpdate((movie._id as mongoose.Types.ObjectId).toString());
    
    rankingCache.invalidateUserRankings(session.userId);
    
    this.sessions.delete(sessionId);
    rankingCache.deleteSessionData(sessionId);
    
    return newRanking;
  }
  
  
  getSession(sessionId: string): ComparisonSession | undefined {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = rankingCache.getSessionData(sessionId);
      if (session) {
        this.sessions.set(sessionId, session);
      }
    }
    return session;
  }
  
  getUserSessions(userId: mongoose.Types.ObjectId): ComparisonSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.userId.equals(userId)
    );
  }
  
  cancelSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
  
  private generateSessionId(
    userId: mongoose.Types.ObjectId,
    tmdbId: number
  ): string {
    return `${userId.toString()}-${tmdbId}-${Date.now()}`;
  }
  
  cleanupExpiredSessions(maxAgeMinutes: number = 30): void {
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.updatedAt < cutoffTime) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

export default new ComparisonEngine();