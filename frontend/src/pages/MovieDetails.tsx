import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import RankingModal from '../components/ranking/RankingModal';

interface MovieDetails {
  id: string;
  tmdbId: number;
  title: string;
  overview: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  runtime?: number;
  genres?: string[];
  directors?: string[];
  cast?: string[];
  tmdbVoteAverage?: number;
  tmdbVoteCount?: number;
  tmdbPopularity?: number;
  budget?: number;
  revenue?: number;
  tagline?: string;
  homepage?: string;
  productionCompanies?: string[];
  watchProviders?: any;
  externalIds?: {
    imdb_id?: string;
    facebook_id?: string;
    instagram_id?: string;
    twitter_id?: string;
  };
  appStats?: {
    totalRankings: number;
    averageRating: number;
    lastUpdated: string;
  };
  userRanking?: {
    rating: number;
    category: string;
    rankInCategory: number;
    rankingDate: string;
  };
}

export default function MovieDetails() {
  const { tmdbId } = useParams<{ tmdbId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);

  useEffect(() => {
    fetchMovieDetails();
  }, [tmdbId]);

  const fetchMovieDetails = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/movies/${tmdbId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Movie details API response:', response.data);
      console.log('userRanking in response:', response.data.userRanking);
      setMovie(response.data);
    } catch (err: any) {
      console.error('Error fetching movie details:', err);
      setError(err.response?.data?.message || 'Failed to load movie details');
    } finally {
      setLoading(false);
    }
  };

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleRankMovie = () => {
    setIsRankingModalOpen(true);
  };

  const handleCloseRankingModal = () => {
    setIsRankingModalOpen(false);
    // Refresh movie details to get updated ranking data
    fetchMovieDetails();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading movie details...</div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-lg text-red-600 mb-4">{error || 'Movie not found'}</div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div 
      className="h-screen bg-gray-900 bg-cover bg-center bg-fixed relative overflow-hidden"
      style={{
        backgroundImage: movie.backdropPath 
          ? `url(https://image.tmdb.org/t/p/original${movie.backdropPath})` 
          : 'none'
      }}
    >
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 px-4 py-2 bg-black/60 text-white rounded-lg hover:bg-black/80 transition-colors backdrop-blur-sm z-20"
      >
        ← Back
      </button>

      {/* Content Overlay */}
      <div className="h-full flex items-center justify-center p-4">
        <div className="max-w-6xl w-full max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6 text-white">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0">
              <img
                src={movie.posterPath 
                  ? `https://image.tmdb.org/t/p/w500${movie.posterPath}`
                  : '/placeholder-movie.svg'
                }
                alt={movie.title}
                className="w-64 rounded-lg shadow-lg"
              />
            </div>

            {/* Main Info */}
            <div className="flex-grow">
              <div className="mb-4">
                <h1 className="text-4xl font-bold mb-2 text-white">{movie.title}</h1>
                {movie.tagline && (
                  <p className="text-gray-300 italic text-lg mb-2">"{movie.tagline}"</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                  {movie.releaseDate && (
                    <span>{new Date(movie.releaseDate).getFullYear()}</span>
                  )}
                  {movie.runtime && (
                    <span>• {formatRuntime(movie.runtime)}</span>
                  )}
                  {movie.genres && movie.genres.length > 0 && (
                    <span>• {movie.genres.join(', ')}</span>
                  )}
                </div>
              </div>

              {/* Ratings */}
              <div className="flex flex-wrap gap-6 mb-6">
                {movie.tmdbVoteAverage && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      ⭐ {movie.tmdbVoteAverage.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-300">
                      TMDB ({movie.tmdbVoteCount?.toLocaleString()} votes)
                    </div>
                  </div>
                )}
                
                {movie.appStats && movie.appStats.totalRankings > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      📊 {movie.appStats.averageRating.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-300">
                      App Rating ({movie.appStats.totalRankings} rankings)
                    </div>
                  </div>
                )}

                {movie.userRanking && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      ⭐ {movie.userRanking.rating.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-300">
                      Your Rating ({movie.userRanking.category})
                    </div>
                  </div>
                )}

                {movie.externalIds?.imdb_id && (
                  <div className="text-center">
                    <a
                      href={`https://www.imdb.com/title/${movie.externalIds.imdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-400 hover:text-yellow-300"
                    >
                      <div className="text-2xl font-bold">IMDb</div>
                      <div className="text-xs text-gray-300">View on IMDb</div>
                    </a>
                  </div>
                )}
              </div>

              {/* Ranking Action */}
              {!movie.userRanking && user && (
                <div className="mb-6">
                  <button
                    onClick={handleRankMovie}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    ⭐ Rank This Movie
                  </button>
                </div>
              )}

              {/* Overview */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2 text-white">Overview</h2>
                <p className="text-gray-200 leading-relaxed">{movie.overview}</p>
              </div>

              {/* Credits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {movie.directors && movie.directors.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-white mb-1">
                      Director{movie.directors.length > 1 ? 's' : ''}
                    </h3>
                    <p className="text-gray-300">{movie.directors.join(', ')}</p>
                  </div>
                )}

                {movie.cast && movie.cast.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-white mb-1">Top Cast</h3>
                    <p className="text-gray-300">{movie.cast.slice(0, 5).join(', ')}</p>
                  </div>
                )}
              </div>

              {/* Box Office */}
              {(movie.budget || movie.revenue) && (
                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-black/30 rounded-lg">
                  {movie.budget > 0 && (
                    <div>
                      <h3 className="font-semibold text-white mb-1">Budget</h3>
                      <p className="text-gray-300">{formatCurrency(movie.budget)}</p>
                    </div>
                  )}
                  {movie.revenue > 0 && (
                    <div>
                      <h3 className="font-semibold text-white mb-1">Box Office</h3>
                      <p className="text-gray-300">{formatCurrency(movie.revenue)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Production Companies */}
              {movie.productionCompanies && movie.productionCompanies.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-white mb-1">Production Companies</h3>
                  <p className="text-gray-300">{movie.productionCompanies.join(', ')}</p>
                </div>
              )}

              {/* External Links */}
              <div className="flex gap-4">
                {movie.homepage && (
                  <a
                    href={movie.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Official Website
                  </a>
                )}
                
                {movie.externalIds?.facebook_id && (
                  <a
                    href={`https://facebook.com/${movie.externalIds.facebook_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-900 transition-colors"
                  >
                    Facebook
                  </a>
                )}
                
                {movie.externalIds?.twitter_id && (
                  <a
                    href={`https://twitter.com/${movie.externalIds.twitter_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors"
                  >
                    Twitter
                  </a>
                )}
                
                {movie.externalIds?.instagram_id && (
                  <a
                    href={`https://instagram.com/${movie.externalIds.instagram_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors"
                  >
                    Instagram
                  </a>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Ranking Modal */}
      <RankingModal
        isOpen={isRankingModalOpen}
        onClose={handleCloseRankingModal}
        movie={movie ? {
          tmdbId: movie.tmdbId,
          title: movie.title,
          overview: movie.overview,
          posterPath: movie.posterPath,
          releaseDate: movie.releaseDate,
          voteAverage: movie.tmdbVoteAverage || 0,
          inDatabase: true,
          appStats: movie.appStats
        } : null}
      />
    </div>
  );
}