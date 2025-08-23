import React, { useState } from 'react';
import MovieSearch from '../components/MovieSearch';
import CategorySelector from '../components/ranking/CategorySelector';
import ComparisonInterface from '../components/ranking/ComparisonInterface';
import useRankingStore, { type Category } from '../stores/rankingStore';

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

export default function Search() {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const { currentSession, startRanking, isLoading, error } = useRankingStore();

  const handleMovieSelect = async (movie: Movie) => {
    setSelectedMovie(movie);
    setSelectedCategory(null);
  };

  const handleCategorySelect = async (category: Category) => {
    if (!selectedMovie) return;
    
    setSelectedCategory(category);
    await startRanking(selectedMovie.tmdbId, category);
  };

  const handleBack = () => {
    setSelectedMovie(null);
    setSelectedCategory(null);
  };

  if (currentSession) {
    return (
      <div className="p-6">
        <ComparisonInterface />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Search & Rank Movies</h1>
        <p className="text-gray-600">
          Search for movies and add them to your ranked collection
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {selectedMovie ? (
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleBack}
            className="mb-6 text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Search
          </button>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <img
                src={selectedMovie.posterPath 
                  ? `https://image.tmdb.org/t/p/w200${selectedMovie.posterPath}`
                  : '/placeholder-movie.svg'
                }
                alt={selectedMovie.title}
                className="w-24 h-36 object-cover rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-movie.svg';
                }}
              />
              <div>
                <h2 className="text-2xl font-bold mb-2">{selectedMovie.title}</h2>
                {selectedMovie.releaseDate && (
                  <p className="text-gray-600 mb-2">
                    {new Date(selectedMovie.releaseDate).getFullYear()}
                  </p>
                )}
                {selectedMovie.overview && (
                  <p className="text-gray-700 line-clamp-3">
                    {selectedMovie.overview}
                  </p>
                )}
              </div>
            </div>

            <CategorySelector
              onSelect={handleCategorySelect}
              selectedCategory={selectedCategory}
              disabled={isLoading}
            />

            {selectedCategory && (
              <div className="mt-6">
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
      ) : (
        <MovieSearch onMovieSelect={handleMovieSelect} />
      )}
    </div>
  );
}