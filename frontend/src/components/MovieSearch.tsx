import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  userRanking?: {
    rating: number;
    category: string;
    rankInCategory: number;
    rankingDate: string;
  };
}

interface MovieSearchProps {
  onMovieSelect?: (movie: Movie) => void;
}

const MovieSearch: React.FC<MovieSearchProps> = ({ onMovieSelect }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize query from URL params and run search on mount
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      setQuery(urlQuery);
      searchMovies(urlQuery);
    }
  }, []);

  // Update URL when query changes
  const updateURL = (searchQuery: string) => {
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery });
    } else {
      setSearchParams({});
    }
  };

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
      const sortedMovies = (response.data.results || []).sort((a: Movie, b: Movie) => {
        // Sort by total rankings (descending), then by vote average (descending)
        const aRankings = a.appStats?.totalRankings || 0;
        const bRankings = b.appStats?.totalRankings || 0;
        if (aRankings !== bRankings) {
          return bRankings - aRankings;
        }
        return b.voteAverage - a.voteAverage;
      });
      setMovies(sortedMovies);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search movies');
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL(query);
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
            onChange={(e) => {
              setQuery(e.target.value);
              // Clear results if query is empty
              if (!e.target.value.trim()) {
                setMovies([]);
                setSearchParams({});
              }
            }}
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {movies.map((movie) => (
            <MovieCard
              key={movie.tmdbId}
              movie={movie}
              onSelect={onMovieSelect}
              onPosterClick={() => navigate(`/movie/${movie.tmdbId}`)}
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
  onPosterClick?: () => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelect, onPosterClick }) => {
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '';
  const posterUrl = movie.posterPath
    ? `https://image.tmdb.org/t/p/w500${movie.posterPath}`
    : '/placeholder-movie.svg';

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div 
        className="aspect-[2/3] relative cursor-pointer hover:opacity-90 transition-opacity"
        onClick={onPosterClick}
      >
        <img
          src={posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-movie.svg';
          }}
        />
        {movie.userRanking ? (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-1.5 py-0.5 rounded text-xs">
            ★ {movie.userRanking.rating.toFixed(1)}
          </div>
        ) : movie.inDatabase && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white px-1.5 py-0.5 rounded text-xs">
            In DB
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm mb-1 line-clamp-2 leading-tight">
          {movie.title}
        </h3>
        
        <div className="flex justify-between items-center mb-2 text-xs text-gray-600">
          {year && <span>{year}</span>}
          <span>⭐ {movie.voteAverage.toFixed(1)}</span>
        </div>

        {movie.appStats && movie.appStats.totalRankings > 0 && (
          <div className="text-xs text-gray-600 mb-2">
            <p>{movie.appStats.averageRating.toFixed(1)}/10 • {movie.appStats.totalRankings} ranking{movie.appStats.totalRankings !== 1 ? 's' : ''}</p>
          </div>
        )}

        <button
          onClick={() => onSelect?.(movie)}
          className="w-full bg-blue-600 text-white py-1.5 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
        >
          Rank This Movie
        </button>
      </div>
    </div>
  );
};

export default MovieSearch;