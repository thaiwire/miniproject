import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtConfig } from '../../config/jwt.config';
import { JwtPayload } from './jwt.strategy';

// แยก secret คนละตัวกับ access token โดยเจตนา -> ถ้า access token หลุด จะเอาไปสวมรอยเป็น refresh token ไม่ได้
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService<{ jwt: JwtConfig }, true>) {
    const jwtConfig = configService.get('jwt', { infer: true });
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.refreshSecret,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
