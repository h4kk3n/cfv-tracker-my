export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface LoadingState {
  loading: boolean;
  error: string | null;
}
