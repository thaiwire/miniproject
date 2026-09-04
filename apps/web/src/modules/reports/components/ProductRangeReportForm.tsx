"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { previewProductsReport } from "@/modules/reports/report-api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// เงื่อนไข: กรอกช่วงรหัสสินค้า (id) จะกรอกแค่ minId, แค่ maxId, หรือทั้งคู่ก็ได้ (ปล่อยว่างทั้งคู่ = ไม่กรอง เหมือนปุ่ม "ออกรายงาน PDF" เดิม)
// ถ้ากรอกทั้งคู่ minId ต้องไม่มากกว่า maxId (เช็คซ้ำอีกชั้นที่ apps/api และ apps/report ด้วย เผื่อข้าม client มา)
const rangeReportSchema = z
  .object({
    minId: z.coerce.number().int().min(1, "รหัสต้องมากกว่าหรือเท่ากับ 1").optional().or(z.literal("")),
    maxId: z.coerce.number().int().min(1, "รหัสต้องมากกว่าหรือเท่ากับ 1").optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.minId === "" || data.maxId === "" || data.minId === undefined || data.maxId === undefined) {
        return true;
      }
      return data.minId <= data.maxId;
    },
    { message: "รหัสเริ่มต้นต้องไม่มากกว่ารหัสสิ้นสุด", path: ["maxId"] },
  );
type RangeReportFormInput = z.input<typeof rangeReportSchema>;
type RangeReportFormOutput = z.output<typeof rangeReportSchema>;

export default function ProductRangeReportForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RangeReportFormInput, unknown, RangeReportFormOutput>({
    resolver: zodResolver(rangeReportSchema),
    defaultValues: { minId: "", maxId: "" },
  });

  async function onSubmit(data: RangeReportFormOutput) {
    setServerError(null);
    setSuccessMessage(null);
    try {
      await previewProductsReport({
        minId: data.minId === "" || data.minId === undefined ? undefined : data.minId,
        maxId: data.maxId === "" || data.maxId === undefined ? undefined : data.maxId,
      });
      // ไม่ router.push ออกจากหน้านี้ เพราะรายงานเปิดเป็นแท็บใหม่ต่างหาก (ดู previewProductsReport)
      // ผู้ใช้อาจอยากออกรายงานซ้ำด้วยเงื่อนไขอื่นต่อในหน้านี้เลย
      setSuccessMessage("ออกรายงานสำเร็จ ดูผลลัพธ์ได้ที่แท็บใหม่ที่เปิดขึ้น");
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor="minId">รหัสเริ่มต้น</Label>
        <Input id="minId" type="number" min={1} placeholder="เช่น 1" {...register("minId")} />
        {errors.minId && <p className="text-sm text-destructive">{errors.minId.message}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="maxId">รหัสสิ้นสุด</Label>
        <Input id="maxId" type="number" min={1} placeholder="เช่น 50" {...register("maxId")} />
        {errors.maxId && <p className="text-sm text-destructive">{errors.maxId.message}</p>}
      </div>

      <p className="text-xs text-muted-foreground">
        เว้นว่างไว้ได้ทั้งสองช่อง (ออกรายงานทั้งหมด) หรือกรอกแค่ช่องเดียวก็ได้
      </p>

      {serverError && <p className="text-sm text-destructive">⚠ {serverError}</p>}
      {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full h-10 font-bold">
        {isSubmitting ? "กำลังออกรายงาน..." : "ออกรายงาน"}
      </Button>
    </form>
  );
}
