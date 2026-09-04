import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service.js';
import { UserEntity } from './user.entity.js';
import { Role } from '../auth/enums/role.enum.js';

describe('UserService', () => {
  let service: UserService;
  let repo: Repository<UserEntity>;

  const mockUser: UserEntity = {
    id: 1,
    email: 'test@example.com',
    passwordHash: 'old-hash',
    name: 'Old Name',
    role: Role.STAFF,
    avatarUrl: null,
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: vi.fn(),
            create: vi.fn(),
            save: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repo = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  });

  describe('findById', () => {
    it('should throw NotFoundException when the user does not exist', async () => {
      vi.mocked(repo.findOne).mockResolvedValue(null);
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update the name without touching the password', async () => {
      vi.mocked(repo.findOne).mockResolvedValue({ ...mockUser });
      vi.mocked(repo.save).mockImplementation(async (u) => u as UserEntity);

      const result = await service.updateProfile(1, { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(result.passwordHash).toBe('old-hash'); // ไม่ส่ง password มา -> hash เดิมต้องไม่เปลี่ยน
    });

    it('should hash the new password when provided', async () => {
      vi.mocked(repo.findOne).mockResolvedValue({ ...mockUser });
      vi.mocked(repo.save).mockImplementation(async (u) => u as UserEntity);

      const result = await service.updateProfile(1, { password: 'newpassword123' });

      expect(result.passwordHash).not.toBe('old-hash');
      expect(result.passwordHash).not.toBe('newpassword123'); // ต้อง hash แล้ว ไม่ใช่ plaintext
      const matches = await bcrypt.compare('newpassword123', result.passwordHash);
      expect(matches).toBe(true);
    });

    it('should leave name/password unchanged when neither is provided', async () => {
      vi.mocked(repo.findOne).mockResolvedValue({ ...mockUser });
      vi.mocked(repo.save).mockImplementation(async (u) => u as UserEntity);

      const result = await service.updateProfile(1, {});

      expect(result.name).toBe('Old Name');
      expect(result.passwordHash).toBe('old-hash');
    });
  });

  describe('updateAvatar', () => {
    it('should set avatarUrl to the uploads path built from the filename', async () => {
      vi.mocked(repo.findOne).mockResolvedValue({ ...mockUser, avatarUrl: null });
      vi.mocked(repo.save).mockImplementation(async (u) => u as UserEntity);

      const result = await service.updateAvatar(1, 'abc123.jpg');

      expect(result.avatarUrl).toBe('/uploads/avatars/abc123.jpg');
    });

    it('should not throw even when there was no previous avatar to delete', async () => {
      vi.mocked(repo.findOne).mockResolvedValue({ ...mockUser, avatarUrl: null });
      vi.mocked(repo.save).mockImplementation(async (u) => u as UserEntity);

      await expect(service.updateAvatar(1, 'new.jpg')).resolves.not.toThrow();
    });
  });
});
