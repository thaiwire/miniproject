import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductEntity } from './product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity])], // ลงทะเบียน Repository<ProductEntity> ให้ inject ได้
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
