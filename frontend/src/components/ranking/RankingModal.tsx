import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import CategorySelector from './CategorySelector';
import ComparisonInterface from './ComparisonInterface';
import useRankingStore, { type Category } from '../../stores/rankingStore';

interface Movie {
  tmdbId: number;
  title: string;
  overview?: string;
  posterPath?: string;
  releaseDate?: string;
  voteAverage: number;
  inDatabase: boolean;
  appStats?: {
    totalRankings: number;
    averageRating: number;
  };
}

interface RankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie: Movie | null;
}

const RankingModal: React.FC<RankingModalProps> = ({ isOpen, onClose, movie }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const { currentSession, startRanking, cancelSession, isLoading, error } = useRankingStore();

  // Reset state when modal opens with new movie
  useEffect(() => {
    if (isOpen && movie) {
      setSelectedCategory(null);
    }
  }, [isOpen, movie]);

  // Handle modal close
  const handleClose = () => {
    if (currentSession) {
      const confirmed = window.confirm('Are you sure you want to cancel the ranking process?');
      if (confirmed) {
        cancelSession();
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleCategorySelect = async (category: Category) => {
    if (!movie) return;
    setSelectedCategory(category);
    await startRanking(movie.tmdbId, category);
  };

  // Check if ranking is complete
  useEffect(() => {
    if (currentSession?.isCompleted) {
      // Auto-close modal after showing completion for 2 seconds
      const timer = setTimeout(() => {
        cancelSession(); // Clear the session
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentSession?.isCompleted, cancelSession, onClose]);

  if (!movie) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={currentSession ? null : `Add "${movie.title}" to Collection`}
      size={currentSession ? 'ranking' : 'lg'}
      closeOnBackdrop={!currentSession}
      showCloseButton={!currentSession}
    >
      <div className={currentSession ? "p-4" : "p-6"}>
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {currentSession ? (
          <ComparisonInterface />
        ) : (
          <div>
            {/* Movie Info */}
            <div className="flex items-start space-x-4 mb-6">
              <img
                src={movie.posterPath 
                  ? `https://image.tmdb.org/t/p/w200${movie.posterPath}`
                  : '/placeholder-movie.svg'
                }
                alt={movie.title}
                className="w-24 h-36 object-cover rounded-lg flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-movie.svg';
                }}
              />
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">{movie.title}</h2>
                {movie.releaseDate && (
                  <p className="text-gray-600 mb-2">
                    {new Date(movie.releaseDate).getFullYear()}
                  </p>
                )}
                {movie.overview && (
                  <p className="text-gray-700 text-sm line-clamp-3">
                    {movie.overview}
                  </p>
                )}
              </div>
            </div>

            {/* Category Selection */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Select a Category</h3>
              <CategorySelector
                onSelect={handleCategorySelect}
                selectedCategory={selectedCategory}
                disabled={isLoading}
              />

              {selectedCategory && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => handleCategorySelect(selectedCategory)}
                    disabled={isLoading}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Starting...' : 'Start Ranking'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RankingModal;