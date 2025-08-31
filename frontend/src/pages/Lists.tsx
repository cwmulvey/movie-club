import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Movie {
  tmdbId: number;
  title: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  voteAverage: number;
  popularity: number;
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

interface MovieList {
  id: string;
  title: string;
  movies: Movie[];
  loading: boolean;
  error: string | null;
}

export default function Lists() {
  const navigate = useNavigate();
  const [movieLists, setMovieLists] = useState<MovieList[]>([
    { id: 'trending', title: 'Trending This Week', movies: [], loading: true, error: null },
    { id: 'popular', title: 'Popular Movies', movies: [], loading: true, error: null },
    { id: 'now_playing', title: 'Now Playing', movies: [], loading: true, error: null },
    { id: 'upcoming', title: 'Upcoming', movies: [], loading: true, error: null },
    { id: 'top_rated', title: 'Top Rated by Users', movies: [], loading: true, error: null },
    { id: 'decade_2020s', title: 'Best of 2020s', movies: [], loading: true, error: null },
    { id: 'decade_2010s', title: 'Best of 2010s', movies: [], loading: true, error: null },
    { id: 'decade_2000s', title: 'Best of 2000s', movies: [], loading: true, error: null },
  ]);

  useEffect(() => {
    loadAllLists();
  }, []);

  const updateList = (listId: string, updates: Partial<MovieList>) => {
    setMovieLists(prev => prev.map(list => 
      list.id === listId ? { ...list, ...updates } : list
    ));
  };

  const loadAllLists = async () => {
    await Promise.all([
      loadTrendingMovies(),
      loadPopularMovies(),
      loadNowPlayingMovies(),
      loadUpcomingMovies(),
      loadTopRatedMovies(),
      loadDecadeMovies('2020s'),
      loadDecadeMovies('2010s'),
      loadDecadeMovies('2000s'),
    ]);
  };

  const loadTrendingMovies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/movies/trending`,
        {
          params: { timeWindow: 'week' },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      updateList('trending', { movies: response.data.results.slice(0, 20), loading: false });
    } catch (error) {
      updateList('trending', { error: 'Failed to load trending movies', loading: false });
    }
  };

  const loadPopularMovies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/movies/popular`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      updateList('popular', { movies: response.data.results.slice(0, 20), loading: false });
    } catch (error) {
      updateList('popular', { error: 'Failed to load popular movies', loading: false });
    }
  };

  const loadNowPlayingMovies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/movies/now-playing`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      updateList('now_playing', { movies: response.data.results.slice(0, 20), loading: false });
    } catch (error) {
      updateList('now_playing', { error: 'Failed to load now playing movies', loading: false });
    }
  };

  const loadUpcomingMovies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/movies/upcoming`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      updateList('upcoming', { movies: response.data.results.slice(0, 20), loading: false });
    } catch (error) {
      updateList('upcoming', { error: 'Failed to load upcoming movies', loading: false });
    }
  };

  const loadTopRatedMovies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/movies/top-rated-by-users`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      updateList('top_rated', { movies: response.data.results.slice(0, 20), loading: false });
    } catch (error) {
      updateList('top_rated', { error: 'Failed to load top rated movies', loading: false });
    }
  };

  const loadDecadeMovies = async (decade: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/movies/decade/${decade}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      updateList(`decade_${decade.toLowerCase()}`, { 
        movies: response.data.results.slice(0, 20), 
        loading: false 
      });
    } catch (error) {
      updateList(`decade_${decade.toLowerCase()}`, { 
        error: `Failed to load ${decade} movies`, 
        loading: false 
      });
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Movie Lists</h1>
        <p className="text-gray-600">
          Discover curated collections of great movies
        </p>
      </div>

      <div className="space-y-8">
        {movieLists.map((list) => (
          <MovieListSection
            key={list.id}
            list={list}
            onMovieClick={(movie) => navigate(`/movie/${movie.tmdbId}`)}
          />
        ))}
      </div>
    </div>
  );
}

interface MovieListSectionProps {
  list: MovieList;
  onMovieClick: (movie: Movie) => void;
}

const MovieListSection: React.FC<MovieListSectionProps> = ({ list, onMovieClick }) => {
  if (list.loading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{list.title}</h2>
        <div className="flex space-x-4 overflow-x-hidden">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="flex-shrink-0 w-48">
              <div className="aspect-[2/3] bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="mt-2 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="mt-1 h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (list.error) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{list.title}</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {list.error}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">{list.title}</h2>
      <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
        {list.movies.map((movie) => (
          <MovieCard
            key={movie.tmdbId}
            movie={movie}
            onClick={() => onMovieClick(movie)}
          />
        ))}
      </div>
    </div>
  );
};

interface MovieCardProps {
  movie: Movie;
  onClick: () => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick }) => {
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '';
  const posterUrl = movie.posterPath
    ? `https://image.tmdb.org/t/p/w342${movie.posterPath}`
    : '/placeholder-movie.svg';

  return (
    <div 
      className="flex-shrink-0 w-48 cursor-pointer transform hover:scale-105 transition-transform duration-200"
      onClick={onClick}
    >
      <div className="aspect-[2/3] relative rounded-lg overflow-hidden shadow-md">
        <img
          src={posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-movie.svg';
          }}
        />
        {movie.userRanking && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
            ★ {movie.userRanking.rating.toFixed(1)}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <h3 className="text-white font-semibold text-sm line-clamp-2">
            {movie.title}
          </h3>
          <div className="flex justify-between items-center mt-1">
            {year && (
              <span className="text-gray-300 text-xs">{year}</span>
            )}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-yellow-400">⭐</span>
              <span className="text-white">{movie.voteAverage.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};