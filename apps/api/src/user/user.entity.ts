import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { Role } from '../auth/enums/role.enum';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'nvarchar', length: 255, name: 'password_hash' })
  // เก็บ hash เท่านั้น ห้ามเก็บ plaintext password เด็ดขาด (ดู UserService.create ที่ hash ด้วย bcrypt ก่อน save)
  passwordHash: string;

  @Column({ type: 'nvarchar', length: 255 })
  name: string;

  @Column({ type: 'nvarchar', length: 50, default: Role.STAFF })
  role: Role;

  @Column({ type: 'nvarchar', length: 500, name: 'avatar_url', nullable: true })
  // เก็บ path สัมพัทธ์ เช่น /uploads/avatars/xxx.jpg ไม่ใช่ URL เต็ม -> พกพาข้าม dev/prod ได้ (ต่อกับ NEXT_PUBLIC_API_URL ฝั่งเว็บ)
  avatarUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
