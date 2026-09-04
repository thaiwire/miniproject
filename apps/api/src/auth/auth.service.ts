import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { UserEntity } from '../user/user.entity';
import { JwtConfig } from '../config/jwt.config';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<{ jwt: JwtConfig }, true>,
  ) {}

  async validateUser(email: string, password: string): Promise<UserEntity> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    return user;
  }

  async login(user: UserEntity): Promise<AuthResponseDto> {
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const jwtConfig = this.configService.get('jwt', { infer: true });

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: jwtConfig.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('refresh token ไม่ถูกต้องหรือหมดอายุ');
    }

    const user = await this.userService.findByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException('ไม่พบผู้ใช้งาน');
    }

    return this.issueTokens(user);
  }

  private async issueTokens(user: UserEntity): Promise<AuthResponseDto> {
    const jwtConfig = this.configService.get('jwt', { infer: true });
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const dto = new AuthResponseDto();
    dto.accessToken = await this.jwtService.signAsync(payload, {
      secret: jwtConfig.accessSecret,
      expiresIn: jwtConfig.accessExpiresIn as StringValue,
    });
    dto.refreshToken = await this.jwtService.signAsync(payload, {
      secret: jwtConfig.refreshSecret,
      expiresIn: jwtConfig.refreshExpiresIn as StringValue,
    });
    return dto;
  }
}
