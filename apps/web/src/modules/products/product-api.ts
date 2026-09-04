import { apiFetch } from "@/lib/api";
// import type จาก shared-types แทนการประกาศ interface ซ้ำเอง
// -> ถ้า backend เปลี่ยน shape ของ Product ฝั่งนี้จะ error ให้เห็นทันทีตอน build ไม่ต้องรอ runtime
import type {
  Product,
  CreateProductInput,
  PaginatedResult,
} from "@mini-project/shared-types";

// backend เปลี่ยนมาตอบแบบแบ่งหน้าแล้ว (ดู docs/02-API.md Step 13) -> shape เป็น { data, meta } ไม่ใช่ array ตรง ๆ อีกต่อไป
export function getProducts(): Promise<PaginatedResult<Product>> {
  return apiFetch<PaginatedResult<Product>>("/products", { cache: "no-store" });
}

export function getProduct(id: number): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`, { cache: "no-store" });
}

export function createProduct(input: CreateProductInput): Promise<Product> {
  return apiFetch<Product>("/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteProduct(id: number): Promise<void> {
  return apiFetch<void>(`/products/${id}`, { method: "DELETE" });
}