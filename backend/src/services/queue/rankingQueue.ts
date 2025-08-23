import Bull from 'bull';
import { UserRanking } from '../../models/UserRanking';
import { Movie } from '../../models/Movie';
import ratingCalculator from '../ranking/ratingCalculator';
import mongoose from 'mongoose';

interface RatingRecalculationJob {
  userId: string;
  category: 'liked' | 'ok' | 'disliked';
  fromRank?: number;
}

interface MovieStatsUpdateJob {
  movieId: string;
}

class RankingQueue {
  private ratingQueue: Bull.Queue<RatingRecalculationJob>;
  private statsQueue: Bull.Queue<MovieStatsUpdateJob>;
  
  constructor() {
    const redisUrl = 'redis://localhost:6379';
    
    this.ratingQueue = new Bull('rating-recalculation', redisUrl, {
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });
    
    this.statsQueue = new Bull('movie-stats-update', redisUrl, {
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    });
    
    this.setupProcessors();
  }
  
  private setupProcessors(): void {
    this.ratingQueue.process(async (job) => {
      const { userId, category, fromRank } = job.data;
      
      if (fromRank) {
        await ratingCalculator.recalculateRatingsFromRank(
          new mongoose.Types.ObjectId(userId),
          category,
          fromRank
        );
      } else {
        await ratingCalculator.recalculateRatingsForCategory(
          new mongoose.Types.ObjectId(userId),
          category
        );
      }
      
      return { success: true, userId, category };
    });
    
    this.statsQueue.process(async (job) => {
      const { movieId } = job.data;
      
      const rankings = await UserRanking.find({ 
        movieId: new mongoose.Types.ObjectId(movieId) 
      });
      
      const categoryCount = {
        liked: 0,
        ok: 0,
        disliked: 0
      };
      
      let totalRating = 0;
      
      rankings.forEach(ranking => {
        categoryCount[ranking.category]++;
        totalRating += ranking.calculatedRating;
      });
      
      const averageRating = rankings.length > 0 
        ? totalRating / rankings.length 
        : 0;
      
      await Movie.findByIdAndUpdate(movieId, {
        $set: {
          'appStats.totalRankings': rankings.length,
          'appStats.averageRating': Math.round(averageRating * 100) / 100,
          'appStats.likedCount': categoryCount.liked,
          'appStats.okCount': categoryCount.ok,
          'appStats.dislikedCount': categoryCount.disliked,
          'appStats.lastUpdated': new Date()
        }
      });
      
      return { success: true, movieId, totalRankings: rankings.length };
    });
    
    this.ratingQueue.on('completed', (_job, result) => {
      console.log(`Rating recalculation completed for user ${result.userId}`);
    });
    
    this.ratingQueue.on('failed', (_job, err) => {
      console.error(`Rating recalculation failed:`, err);
    });
    
    this.statsQueue.on('completed', (_job, result) => {
      console.log(`Movie stats updated for movie ${result.movieId}`);
    });
    
    this.statsQueue.on('failed', (_job, err) => {
      console.error(`Movie stats update failed:`, err);
    });
  }
  
  async queueRatingRecalculation(
    userId: string,
    category: 'liked' | 'ok' | 'disliked',
    fromRank?: number
  ): Promise<Bull.Job<RatingRecalculationJob>> {
    return this.ratingQueue.add({
      userId,
      category,
      fromRank
    }, {
      delay: 1000,
      priority: fromRank ? 2 : 1
    });
  }
  
  async queueMovieStatsUpdate(movieId: string): Promise<Bull.Job<MovieStatsUpdateJob>> {
    return this.statsQueue.add({
      movieId
    }, {
      delay: 500
    });
  }
  
  async getQueueStats(): Promise<{
    ratingQueue: Bull.JobCounts;
    statsQueue: Bull.JobCounts;
  }> {
    const [ratingCounts, statsCounts] = await Promise.all([
      this.ratingQueue.getJobCounts(),
      this.statsQueue.getJobCounts()
    ]);
    
    return {
      ratingQueue: ratingCounts,
      statsQueue: statsCounts
    };
  }
  
  async cleanQueues(): Promise<void> {
    await Promise.all([
      this.ratingQueue.clean(1000 * 60 * 60 * 24),
      this.statsQueue.clean(1000 * 60 * 60 * 24)
    ]);
  }
  
  async close(): Promise<void> {
    await Promise.all([
      this.ratingQueue.close(),
      this.statsQueue.close()
    ]);
  }
}

export default new RankingQueue();