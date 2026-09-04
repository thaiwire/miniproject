import { IsEmail, IsString, MinLength } from 'class-validator';
import { LoginInput } from '@mini-project/shared-types';

export class LoginDto implements LoginInput {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้อง' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  password: string;
}
