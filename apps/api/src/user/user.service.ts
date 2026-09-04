import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { promises as fs } from 'fs';
import { join } from 'path';
import { UserEntity } from './user.entity';
import { Role } from '../auth/enums/role.enum';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: number): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้งาน');
    }
    return user;
  }

  // แก้ได้แค่ name/password เท่านั้น -> ไม่มี field email/role ให้แก้เอง
  // (email เป็น unique identifier ที่ผูกกับการ login, role ต้องแก้ผ่าน DB ตรง ๆ เท่านั้น กัน privilege escalation)
  async updateProfile(
    id: number,
    input: { name?: string; password?: string },
  ): Promise<UserEntity> {
    const user = await this.findById(id);

    if (input.name) {
      user.name = input.name;
    }
    if (input.password) {
      user.passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    }

    return this.userRepo.save(user);
  }

  // เรียกจาก UserController หลัง multer เขียนไฟล์ลงดิสก์แล้ว (ดู user.controller.ts)
  // save DB ก่อนแล้วค่อยลบไฟล์เก่า -> ถ้า save ล้มเหลว ไฟล์เก่ายังอยู่ครบ ไม่เสี่ยงเหลือ user ที่ไม่มี avatar เลย
  async updateAvatar(id: number, filename: string): Promise<UserEntity> {
    const user = await this.findById(id);
    const oldAvatarUrl = user.avatarUrl;

    user.avatarUrl = `/uploads/avatars/${filename}`;
    const saved = await this.userRepo.save(user);

    if (oldAvatarUrl) {
      const oldFilePath = join(process.cwd(), oldAvatarUrl);
      try {
        await fs.unlink(oldFilePath);
      } catch {
        // ลบไฟล์เก่าไม่สำเร็จ (เช่นไฟล์หายไปแล้ว) ไม่ควรทำให้ request ทั้งหมด fail
        // เพราะ avatar ใหม่ถูกบันทึกลง DB สำเร็จแล้ว เป็นแค่ orphan file เหลือค้างในดิสก์ ไม่ใช่ปัญหาที่ต้อง block user
      }
    }

    return saved;
  }

  async create(input: {
    email: string;
    password: string;
    name: string;
    role?: Role;
  }): Promise<UserEntity> {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = this.userRepo.create({
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role ?? Role.STAFF,
    });
    return this.userRepo.save(user);
  }
}
