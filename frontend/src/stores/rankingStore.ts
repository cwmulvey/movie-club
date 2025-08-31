import { create } from 'zustand';
import axios from 'axios';

export type Category = 'liked' | 'ok' | 'disliked';

export interface Movie {
  id: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  releaseDate?: string;
  overview?: string;
}

export interface Comparison {
  movie1: Movie;
  movie2: Movie;
}

export interface RankingSession {
  sessionId: string;
  category: Category;
  currentComparison?: Comparison;
  completedComparisons: number;
  estimatedRemainingComparisons: number;
  isCompleted: boolean;
  finalRanking?: {
    rankInCategory: number;
    calculatedRating: number;
  };
}

export interface Ranking {
  id: string;
  rank: number;
  rating: number;
  movie: Movie;
  notes?: string;
  tags?: string[];
  watchDate?: Date;
  rewatchable: boolean;
  rankingDate: Date;
  isPublic: boolean;
}

interface RankingStore {
  currentSession: RankingSession | null;
  userRankings: {
    liked: Ranking[];
    ok: Ranking[];
    disliked: Ranking[];
  };
  isLoading: boolean;
  error: string | null;
  
  startRanking: (tmdbId: number, category: Category) => Promise<void>;
  submitComparison: (preference: 'movie1' | 'movie2' | 'tie') => Promise<void>;
  cancelSession: () => Promise<void>;
  clearSession: () => void;
  fetchUserRankings: () => Promise<void>;
  updateRanking: (rankingId: string, updates: Partial<Ranking>) => Promise<void>;
  deleteRanking: (rankingId: string) => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const useRankingStore = create<RankingStore>((set, get) => ({
  currentSession: null,
  userRankings: {
    liked: [],
    ok: [],
    disliked: []
  },
  isLoading: false,
  error: null,
  
  startRanking: async (tmdbId: number, category: Category) => {
    // Clear any existing session and errors first
    set({ currentSession: null, isLoading: true, error: null });
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/rankings/start`,
        { tmdbId, category },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.status === 'completed') {
        set({
          currentSession: {
            sessionId: '',
            category,
            isCompleted: true,
            finalRanking: response.data.ranking,
            completedComparisons: 0,
            estimatedRemainingComparisons: 0
          },
          isLoading: false
        });
        
        await get().fetchUserRankings();
      } else {
        set({
          currentSession: {
            sessionId: response.data.sessionId,
            category,
            currentComparison: response.data.comparison,
            completedComparisons: response.data.completedComparisons,
            estimatedRemainingComparisons: response.data.estimatedRemainingComparisons,
            isCompleted: false
          },
          isLoading: false
        });
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to start ranking',
        isLoading: false
      });
    }
  },
  
  submitComparison: async (preference: 'movie1' | 'movie2' | 'tie') => {
    const session = get().currentSession;
    if (!session || !session.sessionId) return;
    
    set({ isLoading: true, error: null });
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/rankings/compare`,
        {
          sessionId: session.sessionId,
          preference
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.status === 'completed') {
        set({
          currentSession: {
            ...session,
            isCompleted: true,
            finalRanking: response.data.ranking,
            currentComparison: undefined
          },
          isLoading: false
        });
        
        await get().fetchUserRankings();
      } else {
        set({
          currentSession: {
            ...session,
            currentComparison: response.data.comparison,
            completedComparisons: response.data.completedComparisons,
            estimatedRemainingComparisons: response.data.estimatedRemainingComparisons
          },
          isLoading: false
        });
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to submit comparison',
        isLoading: false
      });
    }
  },
  
  cancelSession: async () => {
    const session = get().currentSession;
    if (!session) return;
    
    // If session is completed or has no valid sessionId, just clear the state
    if (session.isCompleted || !session.sessionId || session.sessionId === '') {
      set({ currentSession: null });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/rankings/cancel/${session.sessionId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      set({ currentSession: null });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to cancel session'
      });
    }
  },
  
  clearSession: () => {
    set({ currentSession: null, error: null });
  },
  
  fetchUserRankings: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/rankings/user`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      set({
        userRankings: response.data.rankings,
        isLoading: false
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch rankings',
        isLoading: false
      });
    }
  },
  
  updateRanking: async (rankingId: string, updates: Partial<Ranking>) => {
    set({ isLoading: true, error: null });
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/rankings/${rankingId}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      await get().fetchUserRankings();
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update ranking',
        isLoading: false
      });
    }
  },
  
  deleteRanking: async (rankingId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_BASE_URL}/rankings/${rankingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      await get().fetchUserRankings();
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete ranking',
        isLoading: false
      });
    }
  }
}));

export default useRankingStore;