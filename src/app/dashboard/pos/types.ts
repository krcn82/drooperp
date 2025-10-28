export type Product = {
  id: string;
  name: { de: string; en: string };
  price: number;
  image: string;
  category: string;
  isAvailable: boolean;
  quantity: number;
  taxRate: number;
  sku: string;
};

export type CartItem = Product & { cartId: string; quantity: number };
