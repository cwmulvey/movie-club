import React, { useState } from 'react';
import type { Category, Ranking } from '../../stores/rankingStore';
import { StarIcon, CalendarIcon, TagIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface RankingsListProps {
  rankings: {
    liked: Ranking[];
    ok: Ranking[];
    disliked: Ranking[];
  };
  onEdit?: (ranking: Ranking) => void;
  onDelete?: (rankingId: string) => void;
  isOwner?: boolean;
}

const RankingsList: React.FC<RankingsListProps> = ({
  rankings,
  onEdit,
  onDelete,
  isOwner = true
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>('liked');
  const [expandedRanking, setExpandedRanking] = useState<string | null>(null);
  
  const categoryTabs = [
    { id: 'liked' as Category, label: 'Liked', count: rankings.liked.length, color: 'green' },
    { id: 'ok' as Category, label: 'OK', count: rankings.ok.length, color: 'yellow' },
    { id: 'disliked' as Category, label: 'Disliked', count: rankings.disliked.length, color: 'red' }
  ];
  
  const currentRankings = rankings[selectedCategory];
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${selectedCategory === tab.id
                  ? `border-${tab.color}-500 text-${tab.color}-600`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
              <span className={`
                ml-2 py-0.5 px-2 rounded-full text-xs
                ${selectedCategory === tab.id
                  ? `bg-${tab.color}-100 text-${tab.color}-600`
                  : 'bg-gray-100 text-gray-600'
                }
              `}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>
      
      {currentRankings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No movies in this category yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentRankings.map((ranking) => (
            <RankingCard
              key={ranking.id}
              ranking={ranking}
              isExpanded={expandedRanking === ranking.id}
              onToggleExpand={() => setExpandedRanking(
                expandedRanking === ranking.id ? null : ranking.id
              )}
              onEdit={isOwner ? onEdit : undefined}
              onDelete={isOwner ? onDelete : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface RankingCardProps {
  ranking: Ranking;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit?: (ranking: Ranking) => void;
  onDelete?: (rankingId: string) => void;
}

const RankingCard: React.FC<RankingCardProps> = ({
  ranking,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete
}) => {
  const posterUrl = ranking.movie.posterPath
    ? `https://image.tmdb.org/t/p/w200${ranking.movie.posterPath}`
    : '/placeholder-movie.png';
  
  const year = ranking.movie.releaseDate
    ? new Date(ranking.movie.releaseDate).getFullYear()
    : '';
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {ranking.rank}
              </div>
              <img
                src={posterUrl}
                alt={ranking.movie.title}
                className="w-20 h-28 object-cover rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-movie.png';
                }}
              />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {ranking.movie.title}
                  {year && <span className="text-gray-500 font-normal ml-2">({year})</span>}
                </h3>
                
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => {
                      const filled = i < Math.floor(ranking.rating / 2);
                      return filled ? (
                        <StarIconSolid key={i} className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <StarIcon key={i} className="w-4 h-4 text-gray-300" />
                      );
                    })}
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {ranking.rating.toFixed(1)}/10
                    </span>
                  </div>
                  
                  {ranking.rewatchable && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Rewatchable
                    </span>
                  )}
                  
                  {!ranking.isPublic && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      Private
                    </span>
                  )}
                </div>
                
                {ranking.tags && ranking.tags.length > 0 && (
                  <div className="flex items-center space-x-2 mt-2">
                    <TagIcon className="w-4 h-4 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {ranking.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={onToggleExpand}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                
                {onEdit && (
                  <button
                    onClick={() => onEdit(ranking)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                )}
                
                {onDelete && (
                  <button
                    onClick={() => onDelete(ranking.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {ranking.notes && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Notes</h4>
                <p className="text-sm text-gray-600">{ranking.notes}</p>
              </div>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {ranking.watchDate && (
                <div className="flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  Watched: {new Date(ranking.watchDate).toLocaleDateString()}
                </div>
              )}
              
              <div className="flex items-center">
                <CalendarIcon className="w-4 h-4 mr-1" />
                Ranked: {new Date(ranking.rankingDate).toLocaleDateString()}
              </div>
            </div>
            
            {ranking.movie.overview && (
              <div className="mt-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Synopsis</h4>
                <p className="text-sm text-gray-600">{ranking.movie.overview}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingsList;