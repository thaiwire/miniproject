import { IsOptional, IsString, MinLength } from 'class-validator';

// ไม่มี field email/role ใน DTO นี้เลย -> ผู้ใช้แก้ email เองไม่ได้ (ผูกกับการ login) และแก้ role เองไม่ได้ (กัน privilege escalation)
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร' })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  password?: string;
}
