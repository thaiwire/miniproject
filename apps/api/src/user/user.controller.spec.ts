import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { UserEntity } from './user.entity.js';
import { Role } from '../auth/enums/role.enum.js';
import { JwtPayload } from '../auth/strategies/jwt.strategy.js';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUser: UserEntity = {
    id: 1,
    email: 'test@example.com',
    passwordHash: 'hashed-secret', // ข้อมูลลับ ห้ามหลุดออกไปใน response
    name: 'Test User',
    role: Role.STAFF,
    avatarUrl: null,
    createdAt: new Date('2026-01-01'),
  };

  const currentUser: JwtPayload = { sub: 1, email: 'test@example.com', role: Role.STAFF };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            findById: vi.fn(),
            updateProfile: vi.fn(),
            updateAvatar: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  describe('getProfile', () => {
    it('should never leak passwordHash in the response', async () => {
      vi.mocked(service.findById).mockResolvedValue(mockUser);

      const result = await controller.getProfile(currentUser);

      expect(service.findById).toHaveBeenCalledWith(1);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('updateProfile', () => {
    it('should delegate to service using the current user id (not client-supplied id)', async () => {
      vi.mocked(service.updateProfile).mockResolvedValue({ ...mockUser, name: 'New Name' });

      const result = await controller.updateProfile(currentUser, { name: 'New Name' });

      expect(service.updateProfile).toHaveBeenCalledWith(1, { name: 'New Name' });
      expect(result.name).toBe('New Name');
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('uploadAvatar', () => {
    it('should delegate to service using the current user id (never a client-supplied id) and never leak passwordHash', async () => {
      const mockFile = { filename: 'user-1-abc123.jpg' } as Express.Multer.File;
      vi.mocked(service.updateAvatar).mockResolvedValue({
        ...mockUser,
        avatarUrl: '/uploads/avatars/user-1-abc123.jpg',
      });

      const result = await controller.uploadAvatar(currentUser, mockFile);

      expect(service.updateAvatar).toHaveBeenCalledWith(1, 'user-1-abc123.jpg');
      expect(result.avatarUrl).toBe('/uploads/avatars/user-1-abc123.jpg');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should reject when no file was attached', async () => {
      await expect(
        controller.uploadAvatar(currentUser, undefined as unknown as Express.Multer.File),
      ).rejects.toThrow('กรุณาแนบไฟล์รูปภาพ');
      expect(service.updateAvatar).not.toHaveBeenCalled();
    });
  });
});
