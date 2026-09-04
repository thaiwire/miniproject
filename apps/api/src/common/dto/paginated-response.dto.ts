import type { PaginatedResult, PaginationMeta } from '@mini-project/shared-types';

export class PaginatedResponseDto<T> implements PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;

  static create<T>(
    data: T[],
    page: number,
    limit: number,
    totalItems: number,
  ): PaginatedResponseDto<T> {
    const dto = new PaginatedResponseDto<T>();
    dto.data = data;
    dto.meta = {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
    return dto;
  }
}
