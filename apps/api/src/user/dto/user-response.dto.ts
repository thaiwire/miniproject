import { UserEntity } from '../user.entity';
import type { User as SharedUser } from '@mini-project/shared-types';

export class UserResponseDto implements Omit<SharedUser, 'createdAt'> {
  id: number;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  createdAt: Date;

  // static factory: แปลงจาก Entity -> Response DTO แบบ type-safe
  static fromEntity(user: UserEntity): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.role = user.role;
    dto.avatarUrl = user.avatarUrl;
    dto.createdAt = user.createdAt;
    return dto;
    // สังเกต: ไม่ copy passwordHash มา -> hash รหัสผ่านไม่มีวันหลุดออกไปให้ client เห็นเด็ดขาด
  }
}
