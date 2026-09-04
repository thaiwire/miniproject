import ProductRangeReportForm from "@/modules/reports/components/ProductRangeReportForm";

export default function ProductRangeReportPage() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
      <h1 className="mb-1 text-xl font-bold">ออกรายงานสินค้าตามช่วงรหัส</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        ระบุช่วงรหัสสินค้า (id) ที่ต้องการ แล้วออกรายงานเฉพาะสินค้าที่อยู่ในช่วงนั้น
      </p>
      <ProductRangeReportForm />
    </div>
  );
}
