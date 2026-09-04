import ProductForm from "@/components/ProductForm";

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
      <h1 className="mb-4 text-xl font-bold">เพิ่มสินค้าใหม่</h1>
      <ProductForm />
    </div>
  );
}
