import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';
import { ProductEntity } from './product.entity.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

describe('ProductController', () => {
  let controller: ProductController;
  let service: ProductService;

  const mockProduct: ProductEntity = {
    id: 1,
    name: 'เสื้อยืด',
    price: 199,
    costPrice: 100, // ข้อมูลลับ ห้ามหลุดออกไปใน response
    stock: 10,
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: {
            findAll: vi.fn(),
            findOne: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
            adjustStock: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get<ProductService>(ProductService);
  });

  describe('findAll', () => {
    it('should never leak costPrice in the paginated response', async () => {
      vi.mocked(service.findAll).mockResolvedValue([[mockProduct], 1]);
      const query = Object.assign(new PaginationQueryDto(), { page: 1, limit: 20 });

      const result = await controller.findAll(query);

      expect(result.data[0]).not.toHaveProperty('costPrice');
      expect(result.data[0].name).toBe('เสื้อยืด');
      expect(result.meta).toEqual({ page: 1, limit: 20, totalItems: 1, totalPages: 1 });
    });
  });

  describe('findOne', () => {
    it('should never leak costPrice for a single product', async () => {
      vi.mocked(service.findOne).mockResolvedValue(mockProduct);
      const result = await controller.findOne(1);
      expect(result).not.toHaveProperty('costPrice');
    });
  });

  describe('create', () => {
    it('should delegate to service and strip costPrice from the response', async () => {
      const dto = { name: 'เสื้อยืด', price: 199, costPrice: 100, stock: 10 };
      vi.mocked(service.create).mockResolvedValue(mockProduct);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).not.toHaveProperty('costPrice');
    });
  });

  describe('adjustStock', () => {
    it('should delegate delta to the service', async () => {
      vi.mocked(service.adjustStock).mockResolvedValue({ ...mockProduct, stock: 7 });

      const result = await controller.adjustStock(1, { delta: -3 });

      expect(service.adjustStock).toHaveBeenCalledWith(1, -3);
      expect(result.stock).toBe(7);
    });
  });

  describe('remove', () => {
    it('should delegate to service.remove', async () => {
      vi.mocked(service.remove).mockResolvedValue(undefined);
      await controller.remove(1);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
