import React, { useState } from 'react';
import MovieSearch from '../components/MovieSearch';
import RankingModal from '../components/ranking/RankingModal';

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
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);

  const handleMovieSelect = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsRankingModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsRankingModalOpen(false);
    // Keep the selected movie for a moment to prevent flash
    setTimeout(() => setSelectedMovie(null), 300);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Search & Rank Movies</h1>
        <p className="text-gray-600">
          Search for movies and add them to your ranked collection
        </p>
      </div>

      <MovieSearch onMovieSelect={handleMovieSelect} />

      <RankingModal
        isOpen={isRankingModalOpen}
        onClose={handleCloseModal}
        movie={selectedMovie}
      />
    </div>
  );
}