import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RankingsList from '../components/ranking/RankingsList';
import useRankingStore from '../stores/rankingStore';

interface TrendingMovie {
  tmdbId: number;
  title: string;
  overview?: string;
  posterPath?: string;
  releaseDate?: string;
  voteAverage: number;
  popularity: number;
  inDatabase: boolean;
  appStats?: {
    totalRankings: number;
    averageRating: number;
  };
}

export default function Lists() {
  const [trendingMovies, setTrendingMovies] = useState<TrendingMovie[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const { userRankings, fetchUserRankings, isLoading } = useRankingStore();

  useEffect(() => {
    fetchUserRankings();
    loadTrendingMovies();
  }, []);

  const loadTrendingMovies = async () => {
    setLoadingTrending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/movies/trending`,
        {
          params: { timeWindow: 'week' },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setTrendingMovies(response.data.results || []);
    } catch (error) {
      console.error('Failed to load trending movies:', error);
    } finally {
      setLoadingTrending(false);
    }
  };

  const totalRankings = userRankings.liked.length + userRankings.ok.length + userRankings.disliked.length;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Movie Collection</h1>
        <p className="text-gray-600">
          View your ranked movies and discover trending films
        </p>
      </div>

      {totalRankings > 0 ? (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Your Rankings</h2>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <RankingsList 
              rankings={userRankings}
              isOwner={true}
            />
          </div>
        </div>
      ) : (
        <div className="mb-12 bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-lg">
          <h3 className="font-semibold mb-2">Start Building Your Collection</h3>
          <p className="mb-3">
            You haven't ranked any movies yet. Head to the Search page to find and rank your first movie!
          </p>
          <a
            href="/search"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            Search Movies
          </a>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-6">Trending This Week</h2>
        
        {loadingTrending ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading trending movies...</p>
          </div>
        ) : trendingMovies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {trendingMovies.map((movie) => (
              <TrendingMovieCard key={movie.tmdbId} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Unable to load trending movies at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface TrendingMovieCardProps {
  movie: TrendingMovie;
}

const TrendingMovieCard: React.FC<TrendingMovieCardProps> = ({ movie }) => {
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
        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
          Trending
        </div>
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

        <div className="text-sm text-gray-600 mb-3">
          <p>TMDB Rating: {movie.voteAverage.toFixed(1)}/10</p>
          {movie.appStats && movie.appStats.totalRankings > 0 && (
            <>
              <p>App Rating: {movie.appStats.averageRating.toFixed(1)}/10</p>
              <p>{movie.appStats.totalRankings} ranking(s)</p>
            </>
          )}
        </div>

        <a
          href="/search"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors block text-center"
        >
          Rank This Movie
        </a>
      </div>
    </div>
  );
};