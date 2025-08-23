import rankingAlgorithm from '../../services/ranking/rankingAlgorithm';
import { BinarySearchState, ComparisonResult } from '../../services/ranking/rankingAlgorithm';
import mongoose from 'mongoose';

describe('RankingAlgorithm', () => {
  const userId = new mongoose.Types.ObjectId();
  const newMovieId = new mongoose.Types.ObjectId();
  
  const createMockRankings = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      _id: new mongoose.Types.ObjectId(),
      userId,
      movieId: new mongoose.Types.ObjectId(),
      tmdbId: 1000 + i,
      category: 'liked' as const,
      rankInCategory: i + 1,
      calculatedRating: 10 - (i * 0.5),
      comparisonHistory: {
        wonAgainst: [],
        lostTo: [],
        tiedWith: []
      },
      isPublic: true,
      rankingDate: new Date(),
      lastModified: new Date(),
      modificationCount: 0
    })) as any;
  };
  
  describe('findInsertionPosition', () => {
    it('should return position 1 for empty rankings', async () => {
      const state: BinarySearchState = {
        category: 'liked',
        userId,
        newMovieId,
        searchRange: { low: 1, high: 0 },
        comparisons: []
      };
      
      const result = await rankingAlgorithm.findInsertionPosition(state, []);
      
      expect(result.finalPosition).toBe(1);
      expect(result.movieToCompare).toBeUndefined();
    });
    
    it('should return middle movie for initial comparison', async () => {
      const mockRankings = createMockRankings(10);
      const state: BinarySearchState = {
        category: 'liked',
        userId,
        newMovieId,
        searchRange: { low: 1, high: 10 },
        comparisons: []
      };
      
      const result = await rankingAlgorithm.findInsertionPosition(state, mockRankings);
      
      expect(result.movieToCompare).toBeDefined();
      expect(result.movieToCompare?.rankInCategory).toBe(5);
      expect(result.finalPosition).toBeUndefined();
    });
    
    it('should narrow search range based on comparison results', async () => {
      const mockRankings = createMockRankings(10);
      const comparison: ComparisonResult = {
        winner: 'new',
        newMovieId,
        existingMovieId: mockRankings[4].movieId
      };
      
      const state: BinarySearchState = {
        category: 'liked',
        userId,
        newMovieId,
        searchRange: { low: 1, high: 10 },
        comparisons: [comparison]
      };
      
      const result = await rankingAlgorithm.findInsertionPosition(state, mockRankings);
      
      expect(result.movieToCompare?.rankInCategory).toBeLessThan(5);
    });
    
    it('should find final position when range is exhausted', async () => {
      const mockRankings = createMockRankings(3);
      const state: BinarySearchState = {
        category: 'liked',
        userId,
        newMovieId,
        searchRange: { low: 2, high: 1 },
        comparisons: []
      };
      
      const result = await rankingAlgorithm.findInsertionPosition(state, mockRankings);
      
      expect(result.finalPosition).toBe(2);
      expect(result.movieToCompare).toBeUndefined();
    });
  });
  
  describe('processComparisonResult', () => {
    it('should narrow range up when new movie wins', () => {
      const state: BinarySearchState = {
        category: 'liked',
        userId,
        newMovieId,
        searchRange: { low: 1, high: 10 },
        comparisons: []
      };
      
      const result: ComparisonResult = {
        winner: 'new',
        newMovieId,
        existingMovieId: new mongoose.Types.ObjectId()
      };
      
      const newState = rankingAlgorithm.processComparisonResult(state, result);
      
      expect(newState.searchRange.high).toBeLessThan(state.searchRange.high);
      expect(newState.searchRange.low).toBe(state.searchRange.low);
      expect(newState.comparisons).toHaveLength(1);
    });
    
    it('should narrow range down when existing movie wins', () => {
      const state: BinarySearchState = {
        category: 'liked',
        userId,
        newMovieId,
        searchRange: { low: 1, high: 10 },
        comparisons: []
      };
      
      const result: ComparisonResult = {
        winner: 'existing',
        newMovieId,
        existingMovieId: new mongoose.Types.ObjectId()
      };
      
      const newState = rankingAlgorithm.processComparisonResult(state, result);
      
      expect(newState.searchRange.low).toBeGreaterThan(state.searchRange.low);
      expect(newState.searchRange.high).toBe(state.searchRange.high);
      expect(newState.comparisons).toHaveLength(1);
    });
    
    it('should handle tie by placing after tied movie', () => {
      const state: BinarySearchState = {
        category: 'liked',
        userId,
        newMovieId,
        searchRange: { low: 1, high: 10 },
        comparisons: []
      };
      
      const result: ComparisonResult = {
        winner: 'tie',
        newMovieId,
        existingMovieId: new mongoose.Types.ObjectId()
      };
      
      const newState = rankingAlgorithm.processComparisonResult(state, result);
      
      expect(newState.searchRange.low).toBe(6);
      expect(newState.searchRange.high).toBe(5);
    });
  });
  
  describe('estimateRemainingComparisons', () => {
    it('should return 0 for exhausted range', () => {
      const state: BinarySearchState = {
        category: 'liked',
        userId,
        newMovieId,
        searchRange: { low: 5, high: 4 },
        comparisons: []
      };
      
      const estimate = rankingAlgorithm.estimateRemainingComparisons(state);
      
      expect(estimate).toBe(0);
    });
    
    it('should calculate log2 of range size', () => {
      const state: BinarySearchState = {
        category: 'liked',
        userId,
        newMovieId,
        searchRange: { low: 1, high: 8 },
        comparisons: []
      };
      
      const estimate = rankingAlgorithm.estimateRemainingComparisons(state);
      
      expect(estimate).toBe(3);
    });
    
    it('should round up for non-power-of-2 ranges', () => {
      const state: BinarySearchState = {
        category: 'liked',
        userId,
        newMovieId,
        searchRange: { low: 1, high: 10 },
        comparisons: []
      };
      
      const estimate = rankingAlgorithm.estimateRemainingComparisons(state);
      
      expect(estimate).toBe(4);
    });
  });
});