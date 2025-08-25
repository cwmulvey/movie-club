import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useRankingStore, { type Ranking } from '../stores/rankingStore';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface MoviePoster {
  id: string;
  rank: number;
  rating: number;
  category: 'liked' | 'ok' | 'disliked';
  movie: {
    id: string;
    tmdbId?: number;
    title: string;
    posterPath?: string;
    releaseDate?: string;
  };
}

export default function Account() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userRankings, fetchUserRankings, isLoading } = useRankingStore();
  const [allMovies, setAllMovies] = useState<MoviePoster[]>([]);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    fetchUserRankings();
  }, [fetchUserRankings]);

  useEffect(() => {
    // Flatten all categories and sort by rating (highest to lowest)
    const flatMovies: MoviePoster[] = [];
    
    // Add liked movies (highest ratings)
    userRankings.liked.forEach((ranking, index) => {
      flatMovies.push({
        id: ranking.id,
        rank: index + 1,
        rating: ranking.rating,
        category: 'liked',
        movie: ranking.movie
      });
    });

    // Add ok movies (middle ratings)  
    userRankings.ok.forEach((ranking, index) => {
      flatMovies.push({
        id: ranking.id,
        rank: userRankings.liked.length + index + 1,
        rating: ranking.rating,
        category: 'ok',
        movie: ranking.movie
      });
    });

    // Add disliked movies (lowest ratings)
    userRankings.disliked.forEach((ranking, index) => {
      flatMovies.push({
        id: ranking.id,
        rank: userRankings.liked.length + userRankings.ok.length + index + 1,
        rating: ranking.rating,
        category: 'disliked',
        movie: ranking.movie
      });
    });

    setAllMovies(flatMovies);
  }, [userRankings]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    // Add visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null);
    setDragOverItem(null);
    // Reset visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem(index);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleMovieClick = (tmdbId?: number) => {
    if (tmdbId && !isReordering) {
      navigate(`/movie/${tmdbId}`);
    }
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === dropIndex) return;

    setIsReordering(true);
    
    try {
      // Reorder movies locally first for immediate UI feedback
      const newMovies = [...allMovies];
      const [reorderedItem] = newMovies.splice(draggedItem, 1);
      newMovies.splice(dropIndex, 0, reorderedItem);
      
      // Update ranks for local display
      const updatedMovies = newMovies.map((movie, index) => ({
        ...movie,
        rank: index + 1
      }));
      
      setAllMovies(updatedMovies);
      
      // Send update to backend
      await updateRankingsOrder(updatedMovies);
      
      // Refresh data from backend to get updated ratings
      await fetchUserRankings();
      
    } catch (error) {
      console.error('Failed to reorder movies:', error);
      // Revert on error
      await fetchUserRankings();
    } finally {
      setIsReordering(false);
      setDraggedItem(null);
      setDragOverItem(null);
    }
  };

  const updateRankingsOrder = async (movies: MoviePoster[]) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('token');
    
    // Group movies by category and create update requests
    const updates = movies.map((movie) => ({
      rankingId: movie.id,
      newRank: movie.rank,
      category: movie.category
    }));

    await axios.put(`${API_URL}/rankings/reorder`, {
      updates
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading your movie collection...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Rankings</h1>
        <p className="text-gray-600">
          {user?.profile?.firstName}'s ranked movie collection ({allMovies.length} movies)
        </p>
        {isReordering && (
          <div className="flex items-center mt-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm">Updating rankings...</span>
          </div>
        )}
        {!isReordering && allMovies.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            💡 Drag and drop to reorder your rankings
          </p>
        )}
      </div>

      {allMovies.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">No movies ranked yet</p>
          <p className="text-gray-400">Start building your collection by ranking some movies!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {allMovies.map((movie, index) => (
            <div 
              key={movie.id} 
              className={`relative group cursor-move transition-all duration-200 ${
                dragOverItem === index ? 'scale-105 ring-2 ring-blue-500 ring-opacity-50' : ''
              } ${isReordering ? 'pointer-events-none' : ''}`}
              draggable={!isReordering}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              {/* Rank badge */}
              <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-80 text-white px-2 py-1 rounded text-sm font-bold">
                #{movie.rank}
              </div>
              
              {/* Rating badge */}
              <div className="absolute top-2 right-2 z-10 bg-black bg-opacity-80 text-white px-2 py-1 rounded text-xs">
                {movie.rating.toFixed(1)}
              </div>

              {/* Poster */}
              <div 
                className="aspect-[2/3] relative overflow-hidden rounded-lg shadow-md transition-transform group-hover:scale-105 cursor-pointer"
                onClick={() => handleMovieClick(movie.movie.tmdbId)}
              >
                <img
                  src={movie.movie.posterPath 
                    ? `https://image.tmdb.org/t/p/w300${movie.movie.posterPath}`
                    : '/placeholder-movie.svg'
                  }
                  alt={movie.movie.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-movie.svg';
                  }}
                />
                
                {/* Category indicator */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                  movie.category === 'liked' ? 'bg-green-500' :
                  movie.category === 'ok' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />

                {/* Hover overlay with movie title */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-end justify-center">
                  <div className="text-white text-center p-3">
                    <p className="font-semibold text-sm leading-tight drop-shadow-lg">{movie.movie.title}</p>
                    {movie.movie.releaseDate && (
                      <p className="text-xs text-gray-300 mt-1 drop-shadow-lg">
                        {new Date(movie.movie.releaseDate).getFullYear()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}