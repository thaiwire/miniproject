import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Mini Product App",
  description: "ตัวอย่าง Next.js + NestJS + TypeScript",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={cn("font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
