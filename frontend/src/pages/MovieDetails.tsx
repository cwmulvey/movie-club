import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

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
}

export default function MovieDetails() {
  const { tmdbId } = useParams<{ tmdbId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-gray-50">
      {/* Backdrop Image */}
      {movie.backdropPath && (
        <div className="relative h-96 w-full">
          <img
            src={`https://image.tmdb.org/t/p/original${movie.backdropPath}`}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 px-4 py-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors backdrop-blur-sm"
          >
            ← Back
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 -mt-32 relative z-10">
        <div className="bg-white rounded-lg shadow-xl p-6">
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
                <h1 className="text-4xl font-bold mb-2">{movie.title}</h1>
                {movie.tagline && (
                  <p className="text-gray-600 italic text-lg mb-2">"{movie.tagline}"</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
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
                    <div className="text-2xl font-bold text-yellow-500">
                      ⭐ {movie.tmdbVoteAverage.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">
                      TMDB ({movie.tmdbVoteCount?.toLocaleString()} votes)
                    </div>
                  </div>
                )}
                
                {movie.appStats && movie.appStats.totalRankings > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">
                      📊 {movie.appStats.averageRating.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">
                      App Rating ({movie.appStats.totalRankings} rankings)
                    </div>
                  </div>
                )}

                {movie.externalIds?.imdb_id && (
                  <div className="text-center">
                    <a
                      href={`https://www.imdb.com/title/${movie.externalIds.imdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-600 hover:text-yellow-700"
                    >
                      <div className="text-2xl font-bold">IMDb</div>
                      <div className="text-xs text-gray-500">View on IMDb</div>
                    </a>
                  </div>
                )}
              </div>

              {/* Overview */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Overview</h2>
                <p className="text-gray-700 leading-relaxed">{movie.overview}</p>
              </div>

              {/* Credits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {movie.directors && movie.directors.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">
                      Director{movie.directors.length > 1 ? 's' : ''}
                    </h3>
                    <p className="text-gray-600">{movie.directors.join(', ')}</p>
                  </div>
                )}

                {movie.cast && movie.cast.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Top Cast</h3>
                    <p className="text-gray-600">{movie.cast.slice(0, 5).join(', ')}</p>
                  </div>
                )}
              </div>

              {/* Box Office */}
              {(movie.budget || movie.revenue) && (
                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  {movie.budget > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">Budget</h3>
                      <p className="text-gray-600">{formatCurrency(movie.budget)}</p>
                    </div>
                  )}
                  {movie.revenue > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">Box Office</h3>
                      <p className="text-gray-600">{formatCurrency(movie.revenue)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Production Companies */}
              {movie.productionCompanies && movie.productionCompanies.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-1">Production Companies</h3>
                  <p className="text-gray-600">{movie.productionCompanies.join(', ')}</p>
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
  );
}