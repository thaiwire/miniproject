"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// input รหัสผ่านที่มีปุ่มดู/ซ่อนในตัว -> ใช้ซ้ำได้ทุกที่ที่มีช่องกรอกรหัสผ่าน (login/register/profile)
const PasswordInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);

    return (
      <div className="relative">
        <Input
          type={isVisible ? "text" : "password"}
          className={cn("pr-9", className)}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          onClick={() => setIsVisible((prev) => !prev)}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
          tabIndex={-1} // กด Tab ข้ามปุ่มนี้ไปเลย ไม่ให้แทรกลำดับการกรอกฟอร์ม
          aria-label={isVisible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        >
          {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
