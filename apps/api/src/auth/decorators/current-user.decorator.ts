import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../strategies/jwt.strategy';

// ดึง user ที่ login อยู่ออกจาก request.user (แนบไว้ตอน JwtStrategy.validate() ผ่าน)
// ใช้แทนการเขียน @Req() req แล้วเจาะ req.user เองทุกที่
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
