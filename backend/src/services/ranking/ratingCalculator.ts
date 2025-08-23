import { UserRanking } from '../../models/UserRanking';
import { Category } from './categoryManager';
import mongoose from 'mongoose';

export class RatingCalculator {
  private readonly categoryRanges: Record<Category, { top: number; bottom: number }> = {
    liked: { top: 10.0, bottom: 6.5 },
    ok: { top: 6.4, bottom: 3.5 },
    disliked: { top: 3.4, bottom: 0.0 }
  };
  
  calculateRating(
    rank: number,
    totalInCategory: number,
    category: Category
  ): number {
    const range = this.categoryRanges[category];
    
    if (totalInCategory === 0) {
      throw new Error('Cannot calculate rating with 0 movies in category');
    }
    
    if (totalInCategory === 1) {
      return range.top;
    }
    
    const rating = range.top - 
      ((rank - 1) * (range.top - range.bottom)) / (totalInCategory - 1);
    
    return Math.round(rating * 100) / 100;
  }
  
  async recalculateRatingsForCategory(
    userId: mongoose.Types.ObjectId,
    category: Category
  ): Promise<void> {
    const rankings = await UserRanking.find({
      userId,
      category
    }).sort({ rankInCategory: 1 });
    
    const totalInCategory = rankings.length;
    console.log(`Recalculating ratings for ${totalInCategory} movies in category '${category}' for user ${userId}`);
    
    const bulkOps = rankings.map((ranking) => {
      const newRating = this.calculateRating(
        ranking.rankInCategory,
        totalInCategory,
        category
      );
      console.log(`  Rank ${ranking.rankInCategory}: ${ranking.calculatedRating} -> ${newRating}`);
      return {
        updateOne: {
          filter: { _id: ranking._id },
          update: {
            $set: {
              calculatedRating: newRating
            }
          }
        }
      };
    });
    
    if (bulkOps.length > 0) {
      await UserRanking.bulkWrite(bulkOps);
    }
  }
  
  async recalculateRatingsFromRank(
    userId: mongoose.Types.ObjectId,
    category: Category,
    fromRank: number
  ): Promise<void> {
    const totalInCategory = await UserRanking.countDocuments({
      userId,
      category
    });
    
    const affectedRankings = await UserRanking.find({
      userId,
      category,
      rankInCategory: { $gte: fromRank }
    }).sort({ rankInCategory: 1 });
    
    const bulkOps = affectedRankings.map((ranking) => ({
      updateOne: {
        filter: { _id: ranking._id },
        update: {
          $set: {
            calculatedRating: this.calculateRating(
              ranking.rankInCategory,
              totalInCategory,
              category
            )
          }
        }
      }
    }));
    
    if (bulkOps.length > 0) {
      await UserRanking.bulkWrite(bulkOps);
    }
  }
  
  async batchRecalculateRatings(
    userId: mongoose.Types.ObjectId,
    categories?: Category[]
  ): Promise<void> {
    const categoriesToUpdate = categories || ['liked', 'ok', 'disliked'] as Category[];
    
    await Promise.all(
      categoriesToUpdate.map(category => 
        this.recalculateRatingsForCategory(userId, category)
      )
    );
  }
  
  getRatingRange(category: Category): { min: number; max: number } {
    const range = this.categoryRanges[category];
    return { min: range.bottom, max: range.top };
  }
  
  isRatingInCategoryRange(rating: number, category: Category): boolean {
    const range = this.categoryRanges[category];
    return rating >= range.bottom && rating <= range.top;
  }
}

export default new RatingCalculator();