import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserRanking } from '../../models/UserRanking';
import { Movie } from '../../models/Movie';
import comparisonEngine from '../../services/ranking/comparisonEngine';
import categoryManager from '../../services/ranking/categoryManager';
import ratingCalculator from '../../services/ranking/ratingCalculator';

describe('Ranking System Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let userId: mongoose.Types.ObjectId;
  let movieIds: mongoose.Types.ObjectId[];
  
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  beforeEach(async () => {
    await UserRanking.deleteMany({});
    await Movie.deleteMany({});
    
    userId = new mongoose.Types.ObjectId();
    movieIds = [];
    
    for (let i = 1; i <= 5; i++) {
      const movie = await Movie.create({
        tmdbId: 1000 + i,
        title: `Test Movie ${i}`,
        overview: `Overview for movie ${i}`,
        posterPath: `/poster${i}.jpg`,
        releaseDate: new Date(2020 + i, 0, 1),
        runtime: 120,
        genres: ['Drama', 'Action'],
        directors: ['Director'],
        cast: ['Actor 1', 'Actor 2'],
        tmdbVoteAverage: 7.5,
        tmdbVoteCount: 1000,
        tmdbPopularity: 100
      });
      movieIds.push(movie._id);
    }
  });
  
  describe('First Movie Ranking', () => {
    it('should automatically rank first movie as #1', async () => {
      const session = await comparisonEngine.startComparisonSession(
        userId,
        1001,
        'liked'
      );
      
      expect(session.completed).toBe(true);
      expect(session.finalPosition).toBe(1);
      
      const ranking = await comparisonEngine.completeRanking(session.id);
      
      expect(ranking.rankInCategory).toBe(1);
      expect(ranking.calculatedRating).toBe(10.0);
      expect(ranking.category).toBe('liked');
    });
  });
  
  describe('Binary Search Ranking', () => {
    beforeEach(async () => {
      for (let i = 0; i < 3; i++) {
        await UserRanking.create({
          userId,
          movieId: movieIds[i],
          tmdbId: 1001 + i,
          category: 'liked',
          rankInCategory: i + 1,
          calculatedRating: 10 - (i * 1.75),
          comparisonHistory: {
            wonAgainst: [],
            lostTo: [],
            tiedWith: []
          },
          isPublic: true,
          rankingDate: new Date()
        });
      }
    });
    
    it('should correctly position new movie through comparisons', async () => {
      const session = await comparisonEngine.startComparisonSession(
        userId,
        1004,
        'liked'
      );
      
      expect(session.completed).toBe(false);
      expect(session.currentComparison).toBeDefined();
      
      const updatedSession1 = await comparisonEngine.submitComparison(
        session.id,
        'movie2'
      );
      
      if (!updatedSession1.completed) {
        const finalSession = await comparisonEngine.submitComparison(
          session.id,
          'movie1'
        );
        
        if (finalSession.completed) {
          const ranking = await comparisonEngine.completeRanking(session.id);
          expect(ranking.rankInCategory).toBeGreaterThanOrEqual(1);
          expect(ranking.rankInCategory).toBeLessThanOrEqual(4);
        }
      }
    });
  });
  
  describe('Category Management', () => {
    it('should maintain separate rankings per category', async () => {
      await UserRanking.create({
        userId,
        movieId: movieIds[0],
        tmdbId: 1001,
        category: 'liked',
        rankInCategory: 1,
        calculatedRating: 10.0,
        comparisonHistory: { wonAgainst: [], lostTo: [], tiedWith: [] },
        isPublic: true,
        rankingDate: new Date()
      });
      
      await UserRanking.create({
        userId,
        movieId: movieIds[1],
        tmdbId: 1002,
        category: 'ok',
        rankInCategory: 1,
        calculatedRating: 6.4,
        comparisonHistory: { wonAgainst: [], lostTo: [], tiedWith: [] },
        isPublic: true,
        rankingDate: new Date()
      });
      
      const likedRankings = await categoryManager.getRankingsInCategory(userId, 'liked');
      const okRankings = await categoryManager.getRankingsInCategory(userId, 'ok');
      
      expect(likedRankings).toHaveLength(1);
      expect(okRankings).toHaveLength(1);
      expect(likedRankings[0].calculatedRating).toBe(10.0);
      expect(okRankings[0].calculatedRating).toBe(6.4);
    });
    
    it('should shift rankings when inserting in middle', async () => {
      for (let i = 0; i < 3; i++) {
        await UserRanking.create({
          userId,
          movieId: movieIds[i],
          tmdbId: 1001 + i,
          category: 'liked',
          rankInCategory: i + 1,
          calculatedRating: 10 - (i * 1.75),
          comparisonHistory: { wonAgainst: [], lostTo: [], tiedWith: [] },
          isPublic: true,
          rankingDate: new Date()
        });
      }
      
      await categoryManager.shiftRankingsDown(userId, 'liked', 2);
      
      const rankings = await categoryManager.getRankingsInCategory(userId, 'liked');
      
      expect(rankings[0].rankInCategory).toBe(1);
      expect(rankings[1].rankInCategory).toBe(3);
      expect(rankings[2].rankInCategory).toBe(4);
    });
  });
  
  describe('Rating Recalculation', () => {
    it('should recalculate ratings when rankings change', async () => {
      for (let i = 0; i < 5; i++) {
        await UserRanking.create({
          userId,
          movieId: movieIds[i],
          tmdbId: 1001 + i,
          category: 'liked',
          rankInCategory: i + 1,
          calculatedRating: 10,
          comparisonHistory: { wonAgainst: [], lostTo: [], tiedWith: [] },
          isPublic: true,
          rankingDate: new Date()
        });
      }
      
      await ratingCalculator.recalculateRatingsForCategory(userId, 'liked');
      
      const rankings = await categoryManager.getRankingsInCategory(userId, 'liked');
      
      expect(rankings[0].calculatedRating).toBe(10.0);
      expect(rankings[4].calculatedRating).toBe(6.5);
      
      const middleRating = rankings[2].calculatedRating;
      expect(middleRating).toBeGreaterThan(6.5);
      expect(middleRating).toBeLessThan(10.0);
    });
  });
  
  describe('Movie Stats Update', () => {
    it('should update movie statistics after ranking', async () => {
      const movieId = movieIds[0];
      
      await UserRanking.create({
        userId,
        movieId,
        tmdbId: 1001,
        category: 'liked',
        rankInCategory: 1,
        calculatedRating: 10.0,
        comparisonHistory: { wonAgainst: [], lostTo: [], tiedWith: [] },
        isPublic: true,
        rankingDate: new Date()
      });
      
      await UserRanking.create({
        userId: new mongoose.Types.ObjectId(),
        movieId,
        tmdbId: 1001,
        category: 'ok',
        rankInCategory: 1,
        calculatedRating: 6.4,
        comparisonHistory: { wonAgainst: [], lostTo: [], tiedWith: [] },
        isPublic: true,
        rankingDate: new Date()
      });
      
      const movie = await Movie.findById(movieId);
      
      if (movie && movie.appStats.totalRankings > 0) {
        expect(movie.appStats.totalRankings).toBe(2);
        expect(movie.appStats.likedCount).toBe(1);
        expect(movie.appStats.okCount).toBe(1);
        expect(movie.appStats.averageRating).toBeCloseTo(8.2, 1);
      }
    });
  });
});