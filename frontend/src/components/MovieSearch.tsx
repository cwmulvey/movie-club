import React, { useState } from 'react';
import axios from 'axios';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

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

interface MovieSearchProps {
  onMovieSelect?: (movie: Movie) => void;
}

const MovieSearch: React.FC<MovieSearchProps> = ({ onMovieSelect }) => {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchMovies = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setMovies([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/movies/search`,
        {
          params: { query: searchQuery },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Movie search results:', response.data.results);
      setMovies(response.data.results || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search movies');
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchMovies(query);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for movies..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="mt-3 w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Searching...' : 'Search Movies'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {movies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {movies.map((movie) => (
            <MovieCard
              key={movie.tmdbId}
              movie={movie}
              onSelect={onMovieSelect}
            />
          ))}
        </div>
      )}

      {query && movies.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">No movies found for "{query}"</p>
        </div>
      )}
    </div>
  );
};

interface MovieCardProps {
  movie: Movie;
  onSelect?: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelect }) => {
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '';
  const posterUrl = movie.posterPath
    ? `https://image.tmdb.org/t/p/w500${movie.posterPath}`
    : '/placeholder-movie.svg';

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="aspect-[2/3] relative">
        <img
          src={posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-movie.svg';
          }}
        />
        {movie.inDatabase && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
            In Database
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 line-clamp-2">
          {movie.title}
        </h3>
        {year && (
          <p className="text-gray-600 text-sm mb-2">{year}</p>
        )}

        {movie.appStats && movie.appStats.totalRankings > 0 && (
          <div className="text-sm text-gray-600 mb-3">
            <p>Average Rating: {movie.appStats.averageRating.toFixed(1)}/10</p>
            <p>{movie.appStats.totalRankings} ranking(s)</p>
          </div>
        )}

        <button
          onClick={() => onSelect?.(movie)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Rank This Movie
        </button>
      </div>
    </div>
  );
};

export default MovieSearch;