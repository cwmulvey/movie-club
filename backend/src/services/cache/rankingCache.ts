import NodeCache from 'node-cache';
import { IRanking } from '../../models/UserRanking';
import mongoose from 'mongoose';

class RankingCache {
  private cache: NodeCache;
  
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 600,
      checkperiod: 120,
      useClones: false
    });
  }
  
  getUserRankingsCacheKey(userId: mongoose.Types.ObjectId, category?: string): string {
    return category 
      ? `rankings:${userId.toString()}:${category}`
      : `rankings:${userId.toString()}:all`;
  }
  
  getRatingCalculationKey(
    userId: mongoose.Types.ObjectId,
    category: string,
    rank: number,
    total: number
  ): string {
    return `rating:${userId.toString()}:${category}:${rank}:${total}`;
  }
  
  getUserRankings(
    userId: mongoose.Types.ObjectId,
    category?: string
  ): IRanking[] | undefined {
    const key = this.getUserRankingsCacheKey(userId, category);
    return this.cache.get(key);
  }
  
  setUserRankings(
    userId: mongoose.Types.ObjectId,
    rankings: IRanking[],
    category?: string
  ): void {
    const key = this.getUserRankingsCacheKey(userId, category);
    this.cache.set(key, rankings);
  }
  
  invalidateUserRankings(userId: mongoose.Types.ObjectId): void {
    const keys = this.cache.keys();
    const userKeys = keys.filter(key => key.includes(userId.toString()));
    this.cache.del(userKeys);
  }
  
  getCachedRating(
    userId: mongoose.Types.ObjectId,
    category: string,
    rank: number,
    total: number
  ): number | undefined {
    const key = this.getRatingCalculationKey(userId, category, rank, total);
    return this.cache.get(key);
  }
  
  setCachedRating(
    userId: mongoose.Types.ObjectId,
    category: string,
    rank: number,
    total: number,
    rating: number
  ): void {
    const key = this.getRatingCalculationKey(userId, category, rank, total);
    this.cache.set(key, rating, 3600);
  }
  
  getSessionData(sessionId: string): any {
    return this.cache.get(`session:${sessionId}`);
  }
  
  setSessionData(sessionId: string, data: any, ttl: number = 1800): void {
    this.cache.set(`session:${sessionId}`, data, ttl);
  }
  
  deleteSessionData(sessionId: string): void {
    this.cache.del(`session:${sessionId}`);
  }
  
  getStats(): NodeCache.Stats {
    return this.cache.getStats();
  }
  
  flush(): void {
    this.cache.flushAll();
  }
}

export default new RankingCache();