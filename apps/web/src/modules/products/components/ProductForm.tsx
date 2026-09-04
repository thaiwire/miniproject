"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createProduct } from "@/modules/products/product-api";
import { ApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// zod schema = ที่เดียวที่ประกาศ validation rule แล้ว TypeScript type ถูก infer ให้อัตโนมัติ
const productSchema = z.object({
  name: z.string().min(2, "ชื่อสินค้าต้องมีอย่างน้อย 2 ตัวอักษร"),
  price: z.coerce.number().min(0, "ราคาขายต้องไม่ติดลบ"),
  costPrice: z.coerce.number().min(0, "ต้นทุนต้องไม่ติดลบ"),
  stock: z.coerce.number().int("ต้องเป็นจำนวนเต็ม").min(0, "สต๊อกต้องไม่ติดลบ"),
});
// z.coerce.number() รับ input เป็น string/unknown แต่ output เป็น number
// ต้องแยก type "ก่อนแปลง" (input) กับ "หลังแปลง" (output) ให้ react-hook-form เข้าใจทั้งคู่
type ProductFormInput = z.input<typeof productSchema>;
type ProductFormOutput = z.output<typeof productSchema>;

export default function ProductForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, unknown, ProductFormOutput>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", price: 0, costPrice: 0, stock: 0 },
  });

  async function onSubmit(data: ProductFormOutput) {
    setServerError(null);
    try {
      await createProduct(data);
      router.push("/products"); // เพิ่มสำเร็จ -> กลับไปหน้า list
    } catch (error) {
      // error จาก backend (เช่น validation ซ้ำซ้อนฝั่ง server) โชว์ให้ user เห็น
      setServerError(
        error instanceof ApiError ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor="name">ชื่อสินค้า</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="price">ราคาขาย (บาท)</Label>
        <Input id="price" type="number" step="0.01" {...register("price")} />
        {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="costPrice">ต้นทุน (บาท)</Label>
        <Input id="costPrice" type="number" step="0.01" {...register("costPrice")} />
        {errors.costPrice && (
          <p className="text-sm text-destructive">{errors.costPrice.message}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="stock">จำนวนสต๊อก</Label>
        <Input id="stock" type="number" {...register("stock")} />
        {errors.stock && <p className="text-sm text-destructive">{errors.stock.message}</p>}
      </div>

      {serverError && <p className="text-sm text-destructive">⚠ {serverError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full h-10 font-bold">
        {isSubmitting ? "กำลังบันทึก..." : "บันทึกสินค้า"}
      </Button>
    </form>
  );
}
