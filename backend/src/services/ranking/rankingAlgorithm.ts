import { IRanking } from '../../models/UserRanking';
import mongoose from 'mongoose';

export interface ComparisonResult {
  winner: 'new' | 'existing' | 'tie';
  newMovieId: mongoose.Types.ObjectId;
  existingMovieId: mongoose.Types.ObjectId;
}

export interface BinarySearchState {
  category: 'liked' | 'ok' | 'disliked';
  userId: mongoose.Types.ObjectId;
  newMovieId: mongoose.Types.ObjectId;
  searchRange: {
    low: number;
    high: number;
  };
  comparisons: ComparisonResult[];
  currentComparisonIndex?: number;
}

export class RankingAlgorithm {
  async findInsertionPosition(
    state: BinarySearchState,
    existingRankings: IRanking[]
  ): Promise<{ movieToCompare?: IRanking; finalPosition?: number }> {
    const { searchRange, comparisons } = state;
    
    if (existingRankings.length === 0) {
      return { finalPosition: 1 };
    }
    
    if (searchRange.low > searchRange.high) {
      return { finalPosition: searchRange.low };
    }
    
    const midpoint = Math.floor((searchRange.low + searchRange.high) / 2);
    const movieToCompare = existingRankings.find(r => r.rankInCategory === midpoint);
    
    if (!movieToCompare) {
      return { finalPosition: midpoint };
    }
    
    const previousComparison = comparisons.find(
      c => c.existingMovieId.equals(movieToCompare.movieId)
    );
    
    if (previousComparison) {
      return this.handlePreviousComparison(
        previousComparison,
        state,
        existingRankings,
        midpoint
      );
    }
    
    return { movieToCompare };
  }
  
  private async handlePreviousComparison(
    comparison: ComparisonResult,
    state: BinarySearchState,
    existingRankings: IRanking[],
    midpoint: number
  ): Promise<{ movieToCompare?: IRanking; finalPosition?: number }> {
    const newState = { ...state };
    
    if (comparison.winner === 'new') {
      newState.searchRange.high = midpoint - 1;
    } else if (comparison.winner === 'existing') {
      newState.searchRange.low = midpoint + 1;
    } else {
      return { finalPosition: midpoint + 1 };
    }
    
    return this.findInsertionPosition(newState, existingRankings);
  }
  
  processComparisonResult(
    state: BinarySearchState,
    result: ComparisonResult
  ): BinarySearchState {
    const newState = { ...state };
    newState.comparisons.push(result);
    
    const midpoint = Math.floor(
      (newState.searchRange.low + newState.searchRange.high) / 2
    );
    
    if (result.winner === 'new') {
      newState.searchRange.high = midpoint - 1;
    } else if (result.winner === 'existing') {
      newState.searchRange.low = midpoint + 1;
    } else {
      newState.searchRange.low = midpoint + 1;
      newState.searchRange.high = midpoint;
    }
    
    return newState;
  }
  
  estimateRemainingComparisons(state: BinarySearchState): number {
    const rangeSize = state.searchRange.high - state.searchRange.low + 1;
    if (rangeSize <= 0) return 0;
    return Math.ceil(Math.log2(rangeSize));
  }
}

export default new RankingAlgorithm();