export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}