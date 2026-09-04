import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// ติด @Public() บน endpoint ที่ไม่ต้อง login (เช่น /auth/login) เพื่อข้าม JwtAuthGuard ที่เปิด global ไว้
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
