namespace Report.Models;

// ตรงกับ Product interface ใน packages/shared-types/src/product.ts เป๊ะ ๆ
// สังเกต: ไม่มี field costPrice เลย เพราะ apps/api ไม่เคยส่ง costPrice ออกมาผ่าน GET /products
// (ดู ProductResponseDto.fromEntity ฝั่ง apps/api) รายงานนี้จึงไม่มีทางเห็นต้นทุนสินค้าได้เลยตั้งแต่ต้นทาง
public class ProductDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PaginationMetaDto
{
    public int Page { get; set; }
    public int Limit { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
}

public class PaginatedProductsDto
{
    public List<ProductDto> Data { get; set; } = [];
    public PaginationMetaDto Meta { get; set; } = new();
}
