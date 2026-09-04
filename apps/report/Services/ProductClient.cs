using Report.Models;

namespace Report.Services;

public interface IProductClient
{
    Task<List<ProductDto>> GetAllProductsAsync(string bearerToken);
}

// เรียก GET /products ของ apps/api แทนการต่อฐานข้อมูลตรง ๆ
// เหตุผล: apps/api มี business rule "ห้าม costPrice หลุดออกไป" อยู่แล้ว (ดู ProductResponseDto)
// เรียกผ่าน API จึงได้กฎนี้มาฟรี ไม่ต้องเขียนซ้ำสองที่ (ที่นี่กับที่ apps/api)
public class ProductClient(HttpClient httpClient) : IProductClient
{
    // จำกัดไว้แค่หน้าเดียว (limit สูงสุดที่ apps/api อนุญาตคือ 100 ต่อครั้ง)
    // ถ้าสินค้ามากกว่า 100 รายการ รายงานรอบแรกนี้จะเห็นแค่ 100 รายการแรก (เรียง id ASC)
    // TODO: ถ้าต้องรองรับเกิน 100 รายการ ค่อยเพิ่ม loop วนทุกหน้าจนกว่า page >= totalPages
    private const int MaxLimit = 100;

    public async Task<List<ProductDto>> GetAllProductsAsync(string bearerToken)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/products?page=1&limit={MaxLimit}");
        request.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<PaginatedProductsDto>();
        return result?.Data ?? [];
    }
}
