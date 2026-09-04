export interface PaginationQuery {
  page?: number;
  limit?: number;
  minId?: number;
  maxId?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
