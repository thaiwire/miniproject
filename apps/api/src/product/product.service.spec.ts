import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between, DataSource, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductService } from './product.service.js';
import { ProductEntity } from './product.entity.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

describe('ProductService', () => {
  let service: ProductService;
  let repo: Repository<ProductEntity>;
  let queryRunnerMock: {
    connect: ReturnType<typeof vi.fn>;
    startTransaction: ReturnType<typeof vi.fn>;
    commitTransaction: ReturnType<typeof vi.fn>;
    rollbackTransaction: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
    manager: { findOne: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };
  };

  const mockProduct: ProductEntity = {
    id: 1,
    name: 'เสื้อยืด',
    price: 199,
    costPrice: 100,
    stock: 10,
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    queryRunnerMock = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager: { findOne: vi.fn(), save: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: {
            find: vi.fn(),
            findAndCount: vi.fn(),
            findOne: vi.fn(),
            create: vi.fn(),
            save: vi.fn(),
            delete: vi.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: vi.fn(() => queryRunnerMock),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    repo = module.get<Repository<ProductEntity>>(getRepositoryToken(ProductEntity));
  });

  describe('findAll', () => {
    it('should pass pagination params (skip/take) through to findAndCount', async () => {
      vi.mocked(repo.findAndCount).mockResolvedValue([[mockProduct], 1]);
      const query = Object.assign(new PaginationQueryDto(), { page: 2, limit: 5 });

      const [items, total] = await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { id: 'ASC' },
        skip: 5, // (page 2 - 1) * limit 5
        take: 5,
      });
      expect(items).toEqual([mockProduct]);
      expect(total).toBe(1);
    });

    it('should filter by id range when both minId and maxId are given', async () => {
      vi.mocked(repo.findAndCount).mockResolvedValue([[mockProduct], 1]);
      const query = Object.assign(new PaginationQueryDto(), { minId: 10, maxId: 50 });

      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: Between(10, 50) } }),
      );
    });

    it('should filter by minId only when maxId is not given', async () => {
      vi.mocked(repo.findAndCount).mockResolvedValue([[mockProduct], 1]);
      const query = Object.assign(new PaginationQueryDto(), { minId: 10 });

      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: MoreThanOrEqual(10) } }),
      );
    });

    it('should filter by maxId only when minId is not given', async () => {
      vi.mocked(repo.findAndCount).mockResolvedValue([[mockProduct], 1]);
      const query = Object.assign(new PaginationQueryDto(), { maxId: 50 });

      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: LessThanOrEqual(50) } }),
      );
    });

    it('should throw BadRequestException when minId is greater than maxId', async () => {
      const query = Object.assign(new PaginationQueryDto(), { minId: 50, maxId: 10 });

      await expect(service.findAll(query)).rejects.toThrow(BadRequestException);
      expect(repo.findAndCount).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return the product when found', async () => {
      vi.mocked(repo.findOne).mockResolvedValue(mockProduct);
      const result = await service.findOne(1);
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when not found', async () => {
      vi.mocked(repo.findOne).mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and save a new product', async () => {
      const dto = { name: 'เสื้อยืด', price: 199, costPrice: 100, stock: 10 };
      vi.mocked(repo.create).mockReturnValue(mockProduct);
      vi.mocked(repo.save).mockResolvedValue(mockProduct);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalledWith(mockProduct);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when the product does not exist', async () => {
      vi.mocked(repo.findOne).mockResolvedValue(null);
      await expect(service.update(999, { name: 'ใหม่' })).rejects.toThrow(NotFoundException);
    });

    it('should merge the dto into the existing product and save', async () => {
      vi.mocked(repo.findOne).mockResolvedValue({ ...mockProduct });
      vi.mocked(repo.save).mockImplementation(async (p) => p as ProductEntity);

      const result = await service.update(1, { stock: 99 });

      expect(result.stock).toBe(99);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when nothing was deleted', async () => {
      vi.mocked(repo.delete).mockResolvedValue({ affected: 0, raw: {} });
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should resolve without error when the row is deleted', async () => {
      vi.mocked(repo.delete).mockResolvedValue({ affected: 1, raw: {} });
      await expect(service.remove(1)).resolves.toBeUndefined();
    });
  });

  describe('adjustStock', () => {
    it('should commit the transaction and return updated stock on success', async () => {
      queryRunnerMock.manager.findOne.mockResolvedValue({ ...mockProduct, stock: 10 });
      queryRunnerMock.manager.save.mockImplementation(async (p) => p);

      const result = await service.adjustStock(1, -3);

      expect(result.stock).toBe(7);
      expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.rollbackTransaction).not.toHaveBeenCalled();
      expect(queryRunnerMock.release).toHaveBeenCalled();
    });

    it('should rollback and rethrow when stock would go negative', async () => {
      queryRunnerMock.manager.findOne.mockResolvedValue({ ...mockProduct, stock: 5 });

      await expect(service.adjustStock(1, -999)).rejects.toThrow(BadRequestException);

      expect(queryRunnerMock.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.release).toHaveBeenCalled(); // ต้อง release เสมอไม่ว่าจะสำเร็จหรือ fail
    });

    it('should rollback and rethrow NotFoundException when the product does not exist', async () => {
      queryRunnerMock.manager.findOne.mockResolvedValue(null);

      await expect(service.adjustStock(999, 1)).rejects.toThrow(NotFoundException);

      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.release).toHaveBeenCalled();
    });
  });
});
