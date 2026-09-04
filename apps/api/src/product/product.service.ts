import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductEntity } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    private readonly dataSource: DataSource, // inject DataSource เพื่อขอ QueryRunner สำหรับ transaction เอง (ดู adjustStock)
  ) {}

  async findAll(query: PaginationQueryDto): Promise<[ProductEntity[], number]> {
    return this.productRepo.findAndCount({
      order: { id: 'ASC' },
      skip: query.skip,
      take: query.limit,
    });
  }

  async findOne(id: number): Promise<ProductEntity> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`ไม่พบสินค้า id: ${id}`);
    }
    return product;
  }

  async create(dto: CreateProductDto): Promise<ProductEntity> {
    const product = this.productRepo.create(dto); // สร้าง entity instance จาก DTO
    return this.productRepo.save(product); // INSERT ลง SQL Server จริง
  }

  async update(id: number, dto: UpdateProductDto): Promise<ProductEntity> {
    const product = await this.findOne(id); // throw NotFoundException อัตโนมัติถ้าไม่เจอ
    Object.assign(product, dto);
    return this.productRepo.save(product); // UPDATE ลง SQL Server จริง
  }

  async remove(id: number): Promise<void> {
    const result = await this.productRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`ไม่พบสินค้า id: ${id}`);
    }
  }

  // ตัวอย่าง pattern การใช้ transaction แบบ manual ผ่าน QueryRunner
  // ใช้ pattern นี้เวลามีหลาย query ที่ต้อง "สำเร็จพร้อมกันทั้งหมด" หรือ "ไม่สำเร็จเลยสักอัน" (atomic)
  // เช่นในระบบ ERP จริง: ตัดสต๊อกสินค้า + สร้างรายการเคลื่อนไหวสต๊อก ต้องเกิดพร้อมกันเสมอ ห้ามสำเร็จแค่ครึ่งเดียว
  async adjustStock(id: number, delta: number): Promise<ProductEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // pessimistic_write: lock แถวนี้ไว้ระหว่าง transaction ไม่ให้ request อื่นแก้พร้อมกัน
      // กัน race condition เช่น 2 คนตัดสต๊อกพร้อมกันแล้วเห็นค่าตั้งต้นเดียวกัน ทำให้ยอดคลาดเคลื่อน
      const product = await queryRunner.manager.findOne(ProductEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) {
        throw new NotFoundException(`ไม่พบสินค้า id: ${id}`);
      }

      const newStock = product.stock + delta;
      if (newStock < 0) {
        throw new BadRequestException('สต๊อกสินค้าจะติดลบ ไม่สามารถทำรายการได้');
      }

      product.stock = newStock;
      await queryRunner.manager.save(product);

      await queryRunner.commitTransaction(); // สำเร็จทุกขั้นตอน -> confirm การเปลี่ยนแปลงจริงลง DB
      return product;
    } catch (err) {
      await queryRunner.rollbackTransaction(); // มี error ตรงไหนก็ตาม -> ย้อนกลับทุกอย่างเหมือนไม่เคยเกิดขึ้น
      throw err;
    } finally {
      await queryRunner.release(); // คืน connection กลับ pool เสมอ ไม่ว่าจะสำเร็จหรือ fail (ป้องกัน connection leak)
    }
  }
}
