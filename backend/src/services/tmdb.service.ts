import axios from 'axios';
import { TMDBSearchResponse } from '../types/tmdb.types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
  throw new Error('TMDB_API_KEY is not defined in environment variables');
}

// Create axios instance with default config
const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
  },
});

export const searchMovies = async (query: string): Promise<TMDBSearchResponse> => {
  try {
    const response = await tmdbApi.get<TMDBSearchResponse>('/search/movie', {
      params: {
        query,
        page: 1,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('TMDB API Error:', error);
    
    if (error.response?.status === 401) {
      throw new Error('Invalid TMDB API key');
    } else if (error.response?.status === 429) {
      throw new Error('TMDB API rate limit exceeded');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Network error connecting to TMDB');
    }
    
    throw new Error('Failed to search movies');
  }
};