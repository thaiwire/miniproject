import 'reflect-metadata'; // ไฟล์นี้ import class ที่มี decorator ตรง ๆ โดยไม่ผ่าน Nest bootstrap เลย ต้องโหลด reflect-metadata เอง
import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto.js';

describe('PaginationQueryDto', () => {
  it('should default to page=1, limit=20 when nothing is provided', async () => {
    const dto = plainToInstance(PaginationQueryDto, {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('should coerce query string values into numbers', async () => {
    const dto = plainToInstance(PaginationQueryDto, { page: '2', limit: '10' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
  });

  it('should reject page less than 1', async () => {
    const dto = plainToInstance(PaginationQueryDto, { page: '0' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it('should reject limit greater than 100', async () => {
    const dto = plainToInstance(PaginationQueryDto, { limit: '500' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('should compute skip correctly from page/limit', () => {
    const dto = Object.assign(new PaginationQueryDto(), { page: 3, limit: 10 });
    expect(dto.skip).toBe(20);
  });
});
