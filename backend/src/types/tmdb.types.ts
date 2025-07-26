export interface TMDBMovie {
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date: string;
    vote_average: number;
    vote_count: number;
  }
  
  export interface TMDBSearchResponse {
    page: number;
    results: TMDBMovie[];
    total_pages: number;
    total_results: number;
  }