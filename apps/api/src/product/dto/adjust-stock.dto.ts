import { IsInt } from 'class-validator';

export class AdjustStockDto {
  // ค่าบวก = เพิ่มสต๊อก, ค่าลบ = ตัดสต๊อก (เช่น -5 คือขายออกไป 5 ชิ้น)
  @IsInt()
  delta: number;
}
