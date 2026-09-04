import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('products') // ชื่อตารางในฐานข้อมูลจะเป็น "products"
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 255 })
  // ใช้ nvarchar ไม่ใช่ varchar เพราะต้องรองรับภาษาไทย/unicode
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // ราคาขาย (โชว์ให้ client เห็นได้)

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'cost_price' })
  costPrice: number; // ต้นทุน (ห้ามโชว์ออก API)

  @Column({ type: 'int', default: 0 })
  stock: number;
  
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}