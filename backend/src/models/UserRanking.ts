import mongoose, { Document, Schema } from 'mongoose';

export interface IRanking extends Document {
  userId: mongoose.Types.ObjectId;
  movieId: mongoose.Types.ObjectId;
  tmdbId: number; // Denormalized for performance
  
  // Category and ranking data
  category: 'liked' | 'ok' | 'disliked';
  rankInCategory: number;
  calculatedRating: number;
  
  // Comparison data for algorithm
  comparisonHistory: {
    wonAgainst: mongoose.Types.ObjectId[];
    lostTo: mongoose.Types.ObjectId[];
    tiedWith: mongoose.Types.ObjectId[];
  };
  
  // User's notes and metadata
  notes?: string;
  tags?: string[];
  watchDate?: Date;
  rewatchable: boolean;
  
  // Privacy settings
  isPublic: boolean;
  
  // Activity tracking
  rankingDate: Date;
  lastModified: Date;
  modificationCount: number;
  
  // Methods
  calculateRating(): number;
}

const userRankingSchema = new Schema<IRanking>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  movieId: {
    type: Schema.Types.ObjectId,
    ref: 'Movie',
    required: true
  },
  tmdbId: {
    type: Number,
    required: true
  },
  
  category: {
    type: String,
    enum: ['liked', 'ok', 'disliked'],
    required: true
  },
  rankInCategory: {
    type: Number,
    required: true,
    min: 1
  },
  calculatedRating: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  
  comparisonHistory: {
    wonAgainst: [{
      type: Schema.Types.ObjectId,
      ref: 'Movie'
    }],
    lostTo: [{
      type: Schema.Types.ObjectId,
      ref: 'Movie'
    }],
    tiedWith: [{
      type: Schema.Types.ObjectId,
      ref: 'Movie'
    }]
  },
  
  notes: {
    type: String,
    maxlength: 1000
  },
  tags: [String],
  watchDate: Date,
  rewatchable: {
    type: Boolean,
    default: false
  },
  
  isPublic: {
    type: Boolean,
    default: true
  },
  
  rankingDate: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  modificationCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound indexes for queries
userRankingSchema.index({ userId: 1, category: 1, rankInCategory: 1 });
userRankingSchema.index({ userId: 1, movieId: 1 }, { unique: true });
userRankingSchema.index({ userId: 1, tmdbId: 1 });
userRankingSchema.index({ userId: 1, calculatedRating: -1 });

// Update lastModified on save
userRankingSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.lastModified = new Date();
    this.modificationCount += 1;
  }
  next();
});

// Method to calculate rating based on rank
userRankingSchema.methods.calculateRating = function(): number {
  const categoryRanges: Record<string, { top: number; bottom: number }> = {
    liked: { top: 10, bottom: 6.5 },
    ok: { top: 6.4, bottom: 3.5 },
    disliked: { top: 3.4, bottom: 0 }
  };
  
  const range = categoryRanges[this.category];
  const totalInCategory = (this.constructor as any).countDocuments({
    userId: this.userId,
    category: this.category
  });
  
  // Rating interpolation formula
  if (totalInCategory === 1) {
    return range.top;
  }
  
  const rating = range.top - ((this.rankInCategory - 1) * (range.top - range.bottom)) / (totalInCategory - 1);
  return Math.round(rating * 10) / 10; // Round to 1 decimal place
};

export const UserRanking = mongoose.model<IRanking>('UserRanking', userRankingSchema);