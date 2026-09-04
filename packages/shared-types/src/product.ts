export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  createdAt: string;
}

export interface CreateProductInput {
  name: string;
  price: number;
  costPrice: number;
  stock: number;
}

export type UpdateProductInput = Partial<CreateProductInput>;
