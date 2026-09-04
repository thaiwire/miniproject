import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductModule } from './product/product.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import databaseConfig, { AppConfig } from './config/database.config';
import jwtConfig from './config/jwt.config';
import { ProductEntity } from './product/product.entity';
import { UserEntity } from './user/user.entity';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,       // ให้ module อื่นเรียกใช้ ConfigService ได้โดยไม่ต้อง import ซ้ำ
      load: [databaseConfig, jwtConfig],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const db = configService.get('database', { infer: true });
        return {
          type: 'mssql' as const,
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          // import class ตรง ๆ แทนการใช้ glob path string (เช่น __dirname + '/**/*.entity{.ts,.js}')
          // เพราะ glob path ทำให้ TypeORM ต้อง require() ไฟล์ .ts ตรง ๆ ตอน connect ซึ่งใช้ไม่ได้เวลารันผ่าน
          // vitest (โหลด src/*.ts โดยไม่ compile ก่อน) แม้จะทำงานได้ปกติเวลารันผ่าน nest start ที่ compile เป็น dist/*.js ก่อนก็ตาม
          // import ตรง ๆ แบบนี้ผ่าน module system ปกติ จึงทำงานถูกต้องทั้ง dev/prod/test เหมือนกันหมด
          entities: [ProductEntity, UserEntity],
          // migrations ยังใช้ glob path string อยู่ (ใช้กับ nest start/start:prod ที่ compile เป็น dist/*.js ก่อนเสมอ)
          // แต่ TypeORM จะ require() ไฟล์ทุกตัวใน array นี้ทันทีตอน connect ไม่ว่า migrationsRun จะเป็น true/false ก็ตาม
          // ตอนรันผ่าน vitest (โหลด src/*.ts ตรง ๆ โดยไม่ compile ก่อน) จึงต้องปิดเป็น array ว่างไปเลย
          // e2e test ไม่ต้อง auto-run อยู่แล้ว เพราะ DB ทดสอบ migrate ไว้ล่วงหน้าผ่าน CLI แล้ว (npm run migration:run ก่อนรัน test:e2e)
          migrations: process.env.VITEST
            ? []
            : [__dirname + '/database/migrations/*{.ts,.js}'],
          migrationsRun: !process.env.VITEST, // apply migration ที่ยังไม่ได้รันอัตโนมัติทุกครั้งที่ boot (สะดวกสำหรับ dev คล้าย synchronize แต่ปลอดภัยกว่า เพราะผ่านไฟล์ migration ที่ review แล้วเท่านั้น)
          synchronize: false, // ⚠️ ปิดแล้ว! ห้าม auto sync schema อีกต่อไป ต้องแก้ schema ผ่าน migration เท่านั้น (ดู npm run migration:generate)
          options: {
            encrypt: false,              // SQL Server on-prem ปกติปิด encrypt
            trustServerCertificate: true, // ข้าม cert verification (dev/internal เท่านั้น)
          },
        };
      },
    }),

    ProductModule,
    UserModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // เปิด global guard 2 ชั้น: ต้อง login ก่อน (JwtAuthGuard) แล้วค่อยเช็ค role (RolesGuard)
    // endpoint ไหนไม่อยาก login ต้องติด @Public() เอง (ดู auth.controller.ts)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
