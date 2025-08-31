import React from 'react';
import useRankingStore from '../../stores/rankingStore';

const ComparisonInterface: React.FC = () => {
  const {
    currentSession,
    submitComparison,
    cancelSession,
    isLoading
  } = useRankingStore();
  
  if (!currentSession) {
    return null;
  }
  
  if (currentSession.isCompleted) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ranking Complete!
          </h2>
          {currentSession.finalRanking && (
            <div className="space-y-2">
              <p className="text-lg text-gray-700">
                Position: <span className="font-semibold">#{currentSession.finalRanking.rankInCategory}</span>
              </p>
              <p className="text-lg text-gray-700">
                Rating: <span className="font-semibold">{currentSession.finalRanking.calculatedRating.toFixed(1)}/10</span>
              </p>
              <p className="text-sm text-gray-600 mt-4">
                Category: <span className="capitalize">{currentSession.category}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  if (!currentSession.currentComparison) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <p className="text-gray-600">Preparing next comparison...</p>
        </div>
      </div>
    );
  }
  
  const { movie1, movie2 } = currentSession.currentComparison;
  const progress = currentSession.completedComparisons / 
    (currentSession.completedComparisons + currentSession.estimatedRemainingComparisons) * 100;
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-gray-900">
            Which movie did you prefer?
          </h2>
          <button
            onClick={() => cancelSession()}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Comparison {currentSession.completedComparisons + 1} of approximately{' '}
          {currentSession.completedComparisons + currentSession.estimatedRemainingComparisons}
        </p>
      </div>
      
      <div className="flex justify-center gap-6">
        <div className="w-full max-w-xs">
          <MovieCard
            movie={movie1}
            onSelect={() => submitComparison('movie1')}
            disabled={isLoading}
          />
        </div>
        
        <div className="w-full max-w-xs">
          <MovieCard
            movie={movie2}
            onSelect={() => submitComparison('movie2')}
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="mt-6 text-center">
        <button
          onClick={() => submitComparison('tie')}
          disabled={isLoading}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          They're about the same
        </button>
      </div>
    </div>
  );
};

interface MovieCardProps {
  movie: {
    title: string;
    posterPath?: string;
    releaseDate?: string;
    overview?: string;
  };
  onSelect: () => void;
  disabled: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onSelect,
  disabled
}) => {
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '';
  const posterUrl = movie.posterPath 
    ? `https://image.tmdb.org/t/p/w342${movie.posterPath}`
    : '/placeholder-movie.svg';
  
  return (
    <div 
      className={`bg-white rounded-lg shadow-lg overflow-hidden flex flex-col cursor-pointer transition-all duration-200 transform ${
        disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:shadow-2xl hover:shadow-blue-400/50 hover:-translate-y-1 hover:scale-[1.02]'
      }`}
      onClick={disabled ? undefined : onSelect}
    >
      <div className="aspect-[2/3] relative">
        <img
          src={posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-movie.svg';
          }}
        />
      </div>
      
      <div className="p-3">
        <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-1">
          {movie.title}
        </h3>
        {year && (
          <p className="text-sm text-gray-600">{year}</p>
        )}
      </div>
    </div>
  );
};

export default ComparisonInterface;