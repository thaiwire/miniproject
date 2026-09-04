"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getProducts } from "@/modules/products/product-api";
import { previewProductsReport } from "@/modules/reports/report-api";
import { ApiError } from "@/lib/api";
import DeleteProductButton from "@/modules/products/components/DeleteProductButton";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Product } from "@mini-project/shared-types";

// component นี้แทนที่หน้า Server Component เดิม (await getProducts() ตอน request time)
// เพราะตอนนี้ต้องแนบ JWT token ที่เก็บใน localStorage ซึ่ง Server Component อ่านไม่ได้
// จึงย้าย fetch มาทำฝั่ง client แทน (useEffect ตอน mount) — ดูเหตุผลเต็ม ๆ ใน docs/03-WEB.md
export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getProducts();
      setProducts(result.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // pattern มาตรฐานของ React สำหรับ fetch ข้อมูลตอน mount (ตาม react.dev)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
  }, [fetchProducts]);

  async function handlePreviewReport() {
    setIsPreviewing(true);
    try {
      await previewProductsReport();
    } catch (err) {
      alert(err instanceof Error ? err.message : "ออกรายงานไม่สำเร็จ");
    } finally {
      setIsPreviewing(false);
    }
  }

  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">รายการสินค้า</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreviewReport} disabled={isPreviewing}>
            {isPreviewing ? "กำลังออกรายงาน..." : "ออกรายงาน PDF"}
          </Button>
          <Link href="/products/report" className={buttonVariants({ variant: "outline" })}>
            รายงานสินค้าตามช่วงรหัส
          </Link>
          <Link href="/products/new" className={buttonVariants({ variant: "default" })}>
            + เพิ่มสินค้า
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">⚠ {error}</p>}
      {isLoading && <p className="mt-4 text-sm text-muted-foreground">กำลังโหลด...</p>}
      {!isLoading && !error && products.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">ยังไม่มีสินค้าในระบบ</p>
      )}

      {!isLoading && products.length > 0 && (
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2">รหัส</th>
              <th className="py-2">ชื่อสินค้า</th>
              <th className="py-2">ราคา</th>
              <th className="py-2">สต๊อก</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b last:border-0">
                <td className="py-2 text-muted-foreground">{product.id}</td>
                <td className="py-2">{product.name}</td>
                <td className="py-2">{product.price.toLocaleString()} บาท</td>
                <td className="py-2">{product.stock}</td>
                <td className="py-2 text-right">
                  <DeleteProductButton productId={product.id} onDeleted={fetchProducts} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
