import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtConfig } from '../../config/jwt.config';
import { Role } from '../enums/role.enum';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService<{ jwt: JwtConfig }, true>) {
    const jwtConfig = configService.get('jwt', { infer: true });
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.accessSecret,
    });
  }

  // ผลลัพธ์จาก validate() จะถูกแนบไปที่ request.user ให้ controller/guard อื่นเรียกใช้ต่อได้
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
