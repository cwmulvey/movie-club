import { UserRanking, IRanking } from '../../models/UserRanking';
import mongoose from 'mongoose';

export type Category = 'liked' | 'ok' | 'disliked';

export interface CategoryRange {
  top: number;
  bottom: number;
  description: string;
}

export class CategoryManager {
  private readonly categoryRanges: Record<Category, CategoryRange> = {
    liked: {
      top: 10.0,
      bottom: 6.5,
      description: "I liked it!"
    },
    ok: {
      top: 6.4,
      bottom: 3.5,
      description: "It was ok"
    },
    disliked: {
      top: 3.4,
      bottom: 0.0,
      description: "I didn't like it."
    }
  };
  
  getCategoryRange(category: Category): CategoryRange {
    return this.categoryRanges[category];
  }
  
  async getRankingsInCategory(
    userId: mongoose.Types.ObjectId,
    category: Category
  ): Promise<IRanking[]> {
    return UserRanking.find({
      userId,
      category
    }).sort({ rankInCategory: 1 });
  }
  
  async getMovieCountInCategory(
    userId: mongoose.Types.ObjectId,
    category: Category
  ): Promise<number> {
    return UserRanking.countDocuments({
      userId,
      category
    });
  }
  
  async shiftRankingsDown(
    userId: mongoose.Types.ObjectId,
    category: Category,
    fromRank: number
  ): Promise<void> {
    await UserRanking.updateMany(
      {
        userId,
        category,
        rankInCategory: { $gte: fromRank }
      },
      {
        $inc: { rankInCategory: 1 }
      }
    );
  }
  
  async shiftRankingsUp(
    userId: mongoose.Types.ObjectId,
    category: Category,
    fromRank: number
  ): Promise<void> {
    await UserRanking.updateMany(
      {
        userId,
        category,
        rankInCategory: { $gt: fromRank }
      },
      {
        $inc: { rankInCategory: -1 }
      }
    );
  }
  
  async moveToCategory(
    rankingId: mongoose.Types.ObjectId,
    newCategory: Category
  ): Promise<IRanking | null> {
    const ranking = await UserRanking.findById(rankingId);
    
    if (!ranking) {
      throw new Error('Ranking not found');
    }
    
    const oldCategory = ranking.category;
    const oldRank = ranking.rankInCategory;
    
    await this.shiftRankingsUp(ranking.userId, oldCategory, oldRank);
    
    const newCategoryCount = await this.getMovieCountInCategory(
      ranking.userId,
      newCategory
    );
    
    ranking.category = newCategory;
    ranking.rankInCategory = newCategoryCount + 1;
    
    await ranking.save();
    
    return ranking;
  }
  
  isValidCategory(category: string): category is Category {
    return category === 'liked' || category === 'ok' || category === 'disliked';
  }
  
  async getTopMoviesInCategory(
    userId: mongoose.Types.ObjectId,
    category: Category,
    limit: number = 10
  ): Promise<IRanking[]> {
    return UserRanking.find({
      userId,
      category
    })
    .sort({ rankInCategory: 1 })
    .limit(limit)
    .populate('movieId');
  }
}

export default new CategoryManager();