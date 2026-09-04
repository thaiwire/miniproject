import { IsEmail, IsString, MinLength } from 'class-validator';

// สังเกต: ไม่มี field "role" ใน DTO นี้เลย -> ผู้สมัครกำหนด role ตัวเองไม่ได้
// UserService.create() จะ set role เป็น STAFF เสมอ กัน privilege escalation ผ่านการสมัครสมาชิก
export class RegisterDto {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้อง' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  password: string;

  @IsString()
  @MinLength(2, { message: 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร' })
  name: string;
}
