import ratingCalculator from '../../services/ranking/ratingCalculator';
import { Category } from '../../services/ranking/categoryManager';

describe('RatingCalculator', () => {
  describe('calculateRating', () => {
    describe('liked category', () => {
      it('should return 10.0 for rank 1', () => {
        const rating = ratingCalculator.calculateRating(1, 10, 'liked');
        expect(rating).toBe(10.0);
      });
      
      it('should return 6.5 for last rank', () => {
        const rating = ratingCalculator.calculateRating(10, 10, 'liked');
        expect(rating).toBeCloseTo(6.5, 1);
      });
      
      it('should calculate correct rating for middle rank', () => {
        const rating = ratingCalculator.calculateRating(5, 10, 'liked');
        expect(rating).toBeCloseTo(8.44, 1);
      });
      
      it('should return top rating for single movie', () => {
        const rating = ratingCalculator.calculateRating(1, 1, 'liked');
        expect(rating).toBe(10.0);
      });
    });
    
    describe('ok category', () => {
      it('should return 6.4 for rank 1', () => {
        const rating = ratingCalculator.calculateRating(1, 10, 'ok');
        expect(rating).toBe(6.4);
      });
      
      it('should return 3.5 for last rank', () => {
        const rating = ratingCalculator.calculateRating(10, 10, 'ok');
        expect(rating).toBeCloseTo(3.5, 1);
      });
      
      it('should calculate correct rating for middle rank', () => {
        const rating = ratingCalculator.calculateRating(5, 10, 'ok');
        expect(rating).toBeCloseTo(5.11, 1);
      });
    });
    
    describe('disliked category', () => {
      it('should return 3.4 for rank 1', () => {
        const rating = ratingCalculator.calculateRating(1, 10, 'disliked');
        expect(rating).toBe(3.4);
      });
      
      it('should return 0.0 for last rank', () => {
        const rating = ratingCalculator.calculateRating(10, 10, 'disliked');
        expect(rating).toBe(0.0);
      });
      
      it('should calculate correct rating for middle rank', () => {
        const rating = ratingCalculator.calculateRating(5, 10, 'disliked');
        expect(rating).toBeCloseTo(1.89, 1);
      });
    });
    
    it('should throw error for 0 movies in category', () => {
      expect(() => {
        ratingCalculator.calculateRating(1, 0, 'liked');
      }).toThrow('Cannot calculate rating with 0 movies in category');
    });
    
    it('should handle edge case of 2 movies correctly', () => {
      const rating1 = ratingCalculator.calculateRating(1, 2, 'liked');
      const rating2 = ratingCalculator.calculateRating(2, 2, 'liked');
      
      expect(rating1).toBe(10.0);
      expect(rating2).toBe(6.5);
    });
  });
  
  describe('getRatingRange', () => {
    it('should return correct range for liked category', () => {
      const range = ratingCalculator.getRatingRange('liked');
      expect(range).toEqual({ min: 6.5, max: 10.0 });
    });
    
    it('should return correct range for ok category', () => {
      const range = ratingCalculator.getRatingRange('ok');
      expect(range).toEqual({ min: 3.5, max: 6.4 });
    });
    
    it('should return correct range for disliked category', () => {
      const range = ratingCalculator.getRatingRange('disliked');
      expect(range).toEqual({ min: 0.0, max: 3.4 });
    });
  });
  
  describe('isRatingInCategoryRange', () => {
    it('should validate ratings for liked category', () => {
      expect(ratingCalculator.isRatingInCategoryRange(8.0, 'liked')).toBe(true);
      expect(ratingCalculator.isRatingInCategoryRange(10.0, 'liked')).toBe(true);
      expect(ratingCalculator.isRatingInCategoryRange(6.5, 'liked')).toBe(true);
      expect(ratingCalculator.isRatingInCategoryRange(6.4, 'liked')).toBe(false);
      expect(ratingCalculator.isRatingInCategoryRange(5.0, 'liked')).toBe(false);
    });
    
    it('should validate ratings for ok category', () => {
      expect(ratingCalculator.isRatingInCategoryRange(5.0, 'ok')).toBe(true);
      expect(ratingCalculator.isRatingInCategoryRange(6.4, 'ok')).toBe(true);
      expect(ratingCalculator.isRatingInCategoryRange(3.5, 'ok')).toBe(true);
      expect(ratingCalculator.isRatingInCategoryRange(6.5, 'ok')).toBe(false);
      expect(ratingCalculator.isRatingInCategoryRange(3.4, 'ok')).toBe(false);
    });
    
    it('should validate ratings for disliked category', () => {
      expect(ratingCalculator.isRatingInCategoryRange(2.0, 'disliked')).toBe(true);
      expect(ratingCalculator.isRatingInCategoryRange(3.4, 'disliked')).toBe(true);
      expect(ratingCalculator.isRatingInCategoryRange(0.0, 'disliked')).toBe(true);
      expect(ratingCalculator.isRatingInCategoryRange(3.5, 'disliked')).toBe(false);
      expect(ratingCalculator.isRatingInCategoryRange(-1.0, 'disliked')).toBe(false);
    });
  });
  
  describe('edge cases and formula verification', () => {
    it('should maintain consistent spacing between ranks', () => {
      const totalMovies = 11;
      const category: Category = 'liked';
      
      const ratings = [];
      for (let rank = 1; rank <= totalMovies; rank++) {
        ratings.push(ratingCalculator.calculateRating(rank, totalMovies, category));
      }
      
      const spacings = [];
      for (let i = 1; i < ratings.length; i++) {
        spacings.push(Math.abs(ratings[i] - ratings[i-1]));
      }
      
      const expectedSpacing = 3.5 / (totalMovies - 1);
      spacings.forEach(spacing => {
        expect(spacing).toBeCloseTo(expectedSpacing, 1);
      });
    });
    
    it('should handle large number of movies', () => {
      const rating = ratingCalculator.calculateRating(50, 100, 'liked');
      expect(rating).toBeGreaterThanOrEqual(6.5);
      expect(rating).toBeLessThanOrEqual(10.0);
      expect(rating).toBeCloseTo(8.23, 1);
    });
  });
});