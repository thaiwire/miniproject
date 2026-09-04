"use client"; // บรรทัดแรกสุดของไฟล์ ต้องมีเสมอสำหรับ Client Component

import { useState } from "react";
import { deleteProduct } from "@/modules/products/product-api";
import { Button } from "@/components/ui/button";

interface DeleteProductButtonProps {
  productId: number;
  onDeleted: () => void;
}

export default function DeleteProductButton({
  productId,
  onDeleted,
}: DeleteProductButtonProps) {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  async function handleDelete() {
    if (!confirm("ยืนยันการลบสินค้านี้หรือไม่?")) return;

    setIsDeleting(true);
    try {
      await deleteProduct(productId);
      onDeleted(); // สั่งให้ ProductList (parent) fetch รายการใหม่ -> ใช้แทน router.refresh() เดิม
      // เพราะตอนนี้ข้อมูลถูก fetch ฝั่ง client (ไม่ใช่ Server Component) แล้ว router.refresh() ใช้ไม่ได้อีกต่อไป
    } catch (error) {
      alert(error instanceof Error ? error.message : "ลบไม่สำเร็จ");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
      {isDeleting ? "กำลังลบ..." : "ลบ"}
    </Button>
  );
}
