import mongoose, { Document, Schema } from 'mongoose';

export interface IMovie extends Document {
  tmdbId: number;
  
  // Cached TMDB data (to reduce API calls)
  title: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: Date;
  runtime?: number;
  genres: string[];
  directors: string[];
  cast: string[];
  
  // TMDB metadata
  tmdbVoteAverage: number;
  tmdbVoteCount: number;
  tmdbPopularity: number;
  
  // Our app's aggregated data
  appStats: {
    totalRankings: number;
    averageRating: number;
    likedCount: number;
    okCount: number;
    dislikedCount: number;
    lastUpdated: Date;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const movieSchema = new Schema<IMovie>({
  tmdbId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  
  title: {
    type: String,
    required: true
  },
  overview: String,
  posterPath: String,
  backdropPath: String,
  releaseDate: Date,
  runtime: Number,
  genres: [String],
  directors: [String],
  cast: [String],
  
  tmdbVoteAverage: { type: Number, default: 0 },
  tmdbVoteCount: { type: Number, default: 0 },
  tmdbPopularity: { type: Number, default: 0 },
  
  appStats: {
    totalRankings: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    likedCount: { type: Number, default: 0 },
    okCount: { type: Number, default: 0 },
    dislikedCount: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Indexes
movieSchema.index({ title: 'text' });
movieSchema.index({ releaseDate: -1 });
movieSchema.index({ 'appStats.totalRankings': -1 });

export const Movie = mongoose.model<IMovie>('Movie', movieSchema);