import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtConfig } from '../config/jwt.config';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<{ jwt: JwtConfig }, true>) => {
        const jwtConfig = configService.get('jwt', { infer: true });
        return {
          secret: jwtConfig.accessSecret,
          // expiresIn ของ jsonwebtoken รับแค่รูปแบบเฉพาะ เช่น "15m"/"7d" (type StringValue จาก package ms)
          // ค่านี้มาจาก env ที่เราควบคุมเอง จึง cast ตรงนี้แทนการ validate runtime เพิ่ม
          signOptions: { expiresIn: jwtConfig.accessExpiresIn as StringValue },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
})
export class AuthModule {}
