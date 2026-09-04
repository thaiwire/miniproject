import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('products') // ทุก route ในนี้ขึ้นต้นด้วย /products
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get() // อ่านได้ทุก role ที่ login แล้ว (ไม่ติด @Roles ก็คือเปิดกว้าง)
  async findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const [products, totalItems] = await this.productService.findAll(query);
    const dtos = products.map((p) => ProductResponseDto.fromEntity(p));
    return PaginatedResponseDto.create(dtos, query.page, query.limit, totalItems);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.findOne(id);
    return ProductResponseDto.fromEntity(product);
  }

  @Post()
  @Roles(Role.ADMIN) // เฉพาะ ADMIN สร้างสินค้าใหม่ได้
  async create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    const product = await this.productService.create(dto);
    return ProductResponseDto.fromEntity(product);
  }

  @Patch(':id')
  @Roles(Role.ADMIN) // เฉพาะ ADMIN แก้ไขข้อมูลสินค้าได้
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.update(id, dto);
    return ProductResponseDto.fromEntity(product);
  }

  @Patch(':id/stock')
  @Roles(Role.ADMIN) // เฉพาะ ADMIN ปรับสต๊อกได้ -> ตัวอย่างการใช้ transaction pattern (ดู ProductService.adjustStock)
  async adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustStockDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productService.adjustStock(id, dto.delta);
    return ProductResponseDto.fromEntity(product);
  }

  @Delete(':id')
  @Roles(Role.ADMIN) // เฉพาะ ADMIN ลบสินค้าได้
  @HttpCode(204) // DELETE สำเร็จ ตอบ 204 No Content (ไม่มี body)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.productService.remove(id);
  }
}
