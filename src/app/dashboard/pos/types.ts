export type Product = {
  id: string;
  name: { de: string; en: string };
  price: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
  quantity: number;
  taxRate: number;
  sku: string;
};

export type CartItem = Product & { cartId: string; quantity: number };

export type Category = {
    id: string;
    name: { de: string, en: string };
    sort: number;
    icon: string;
}
