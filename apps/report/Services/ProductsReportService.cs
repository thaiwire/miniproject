using System.Data;
using FastReport;
using FastReport.Export.PdfSimple;
using Report.Models;

namespace Report.Services;

public interface IProductsReportService
{
    Task<byte[]> GeneratePdfAsync(string bearerToken);
}

public class ProductsReportService(IProductClient productClient, IWebHostEnvironment env)
    : IProductsReportService
{
    public async Task<byte[]> GeneratePdfAsync(string bearerToken)
    {
        var products = await productClient.GetAllProductsAsync(bearerToken);

        using var report = new FastReport.Report();
        report.Load(Path.Combine(env.ContentRootPath, "Reports", "ProductsReport.frx"));

        var table = BuildProductsTable(products);
        report.RegisterData(table, "Products");

        // ต้องเปิด Enabled ให้ datasource เอง ไม่งั้น band จะไม่ผูกกับข้อมูลที่ RegisterData ไว้
        // (สาเหตุที่พบบ่อยที่สุดของ "รายงาน generate สำเร็จแต่ไม่มีแถวข้อมูลเลย")
        var dataSource = report.GetDataSource("Products");
        if (dataSource != null)
        {
            dataSource.Enabled = true;
        }

        report.Prepare();

        using var pdfExport = new PDFSimpleExport();
        using var stream = new MemoryStream();
        report.Export(pdfExport, stream);
        return stream.ToArray();
    }

    private static DataTable BuildProductsTable(List<ProductDto> products)
    {
        var table = new DataTable("Products");
        table.Columns.Add("Id", typeof(int));
        table.Columns.Add("Name", typeof(string));
        table.Columns.Add("Price", typeof(decimal));
        table.Columns.Add("Stock", typeof(int));
        table.Columns.Add("CreatedAt", typeof(DateTime));

        foreach (var p in products)
        {
            table.Rows.Add(p.Id, p.Name, p.Price, p.Stock, p.CreatedAt);
        }

        return table;
    }
}
