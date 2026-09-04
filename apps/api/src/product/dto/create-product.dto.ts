import { IsString, MinLength, IsNumber, Min, IsInt } from 'class-validator';
import { CreateProductInput } from '@mini-project/shared-types';

export class CreateProductDto implements CreateProductInput {
  @IsString()
  @MinLength(2, { message: 'ชื่อสินค้าต้องมีอย่างน้อย 2 ตัวอักษร' })
  name: string;

  @IsNumber()
  @Min(0, { message: 'ราคาขายต้องไม่ติดลบ' })
  price: number;

  @IsNumber()
  @Min(0, { message: 'ต้นทุนต้องไม่ติดลบ' })
  costPrice: number;

  @IsInt()
  @Min(0, { message: 'จำนวนสต๊อกต้องไม่ติดลบ' })
  stock: number;
}
