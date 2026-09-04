import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { UserService } from '../user/user.service.js';
import { UserEntity } from '../user/user.entity.js';
import { Role } from './enums/role.enum.js';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

  const jwtConfigValue = {
    accessSecret: 'test-access-secret',
    accessExpiresIn: '15m',
    refreshSecret: 'test-refresh-secret',
    refreshExpiresIn: '7d',
  };

  let mockUser: UserEntity;

  beforeEach(async () => {
    mockUser = {
      id: 1,
      email: 'admin@test.com',
      passwordHash: await bcrypt.hash('password123', 10),
      name: 'Admin',
      role: Role.ADMIN,
      avatarUrl: null,
      createdAt: new Date('2026-01-01'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: { findByEmail: vi.fn() },
        },
        {
          provide: JwtService,
          useValue: { signAsync: vi.fn(), verifyAsync: vi.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: vi.fn(() => jwtConfigValue) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('validateUser', () => {
    it('should throw UnauthorizedException when the email does not exist', async () => {
      vi.mocked(userService.findByEmail).mockResolvedValue(null);
      await expect(service.validateUser('nobody@test.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when the password is wrong', async () => {
      vi.mocked(userService.findByEmail).mockResolvedValue(mockUser);
      await expect(service.validateUser('admin@test.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return the user when credentials are correct', async () => {
      vi.mocked(userService.findByEmail).mockResolvedValue(mockUser);
      const result = await service.validateUser('admin@test.com', 'password123');
      expect(result).toEqual(mockUser);
    });
  });

  describe('login', () => {
    it('should issue both accessToken and refreshToken', async () => {
      vi.mocked(jwtService.signAsync)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(mockUser);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('refresh', () => {
    it('should reject an invalid/expired refresh token', async () => {
      vi.mocked(jwtService.verifyAsync).mockRejectedValue(new Error('jwt expired'));
      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should issue a new token pair for a valid refresh token', async () => {
      vi.mocked(jwtService.verifyAsync).mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      vi.mocked(userService.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(jwtService.signAsync)
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });
  });
});
