import { ProductEntity } from '../product.entity';
import type { Product as SharedProduct } from '@mini-project/shared-types';

export class ProductResponseDto implements Omit<SharedProduct, 'createdAt'> {
  id: number;
  name: string;
  price: number;
  stock: number;
  createdAt: Date; // ตอนถูกส่งจริงผ่าน HTTP จะถูก JSON.stringify แปลงเป็น string (ISO) ให้อัตโนมัติ

  // static factory method: แปลงจาก Entity -> Response DTO แบบ type-safe
  static fromEntity(product: ProductEntity): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = product.id;
    dto.name = product.name;
    dto.price = product.price;
    dto.stock = product.stock;
    dto.createdAt = product.createdAt;
    return dto;
    // สังเกต: ไม่ copy costPrice มา -> ข้อมูลนี้ไม่มีวันหลุดออกไปให้ client เห็นเด็ดขาด
  }
}
