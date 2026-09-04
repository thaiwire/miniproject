import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationQuery } from '@mini-project/shared-types';

export class PaginationQueryDto implements PaginationQuery {
  @IsOptional()
  @Type(() => Number) // query string เป็น string เสมอ ต้องแปลงเป็น number เองก่อน validate (ต่างจาก @Body ที่ ValidationPipe แปลงให้อัตโนมัติ)
  @IsInt()
  @Min(1, { message: 'page ต้องมากกว่าหรือเท่ากับ 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'limit ต้องมากกว่าหรือเท่ากับ 1' })
  @Max(100, { message: 'limit ต้องไม่เกิน 100 ต่อครั้ง' }) // กัน client ขอข้อมูลทีละมาก ๆ จนฐานข้อมูลหนัก
  limit: number = 20;

  // ช่วง id สำหรับกรองสินค้า (เช่น ออกรายงานเฉพาะ id 10-50) ปล่อยว่างไว้ = ไม่กรอง
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'minId ต้องมากกว่าหรือเท่ากับ 1' })
  minId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'maxId ต้องมากกว่าหรือเท่ากับ 1' })
  maxId?: number;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
