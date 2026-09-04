import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomBytes } from 'crypto';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

const AVATAR_DIR = join(process.cwd(), 'uploads', 'avatars');
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2MB พอสำหรับรูปโปรไฟล์ ไม่ต้องรองรับไฟล์ใหญ่กว่านี้

// ไม่ต้องติด @Public() หรือ @Roles() เลย -> JwtAuthGuard (global) บังคับ login อยู่แล้ว
// และไม่จำกัด role เพราะทุกคนควรดู/แก้ profile ตัวเองได้ไม่ว่าจะเป็น ADMIN หรือ STAFF
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getProfile(@CurrentUser() currentUser: JwtPayload): Promise<UserResponseDto> {
    const user = await this.userService.findById(currentUser.sub);
    return UserResponseDto.fromEntity(user);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.userService.updateProfile(currentUser.sub, dto);
    return UserResponseDto.fromEntity(user);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(AVATAR_DIR)) {
            mkdirSync(AVATAR_DIR, { recursive: true }); // สร้างโฟลเดอร์อัตโนมัติถ้ายังไม่มี (กัน error ตอน deploy ครั้งแรก)
          }
          cb(null, AVATAR_DIR);
        },
        filename: (req, file, cb) => {
          // ห้ามใช้ชื่อไฟล์จาก client ตรง ๆ (path traversal + เดาไฟล์คนอื่นได้) -> ใช้ user id + random suffix แทน
          const userId = (req as unknown as { user: JwtPayload }).user.sub;
          const ext = extname(file.originalname);
          const randomSuffix = randomBytes(8).toString('hex');
          cb(null, `${userId}-${randomSuffix}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException('รองรับเฉพาะไฟล์ JPEG, PNG, WEBP เท่านั้น'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
    }),
  )
  async uploadAvatar(
    @CurrentUser() currentUser: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    if (!file) {
      throw new BadRequestException('กรุณาแนบไฟล์รูปภาพ (JPEG, PNG, WEBP ขนาดไม่เกิน 2MB)');
    }
    const user = await this.userService.updateAvatar(currentUser.sub, file.filename);
    return UserResponseDto.fromEntity(user);
  }
}
