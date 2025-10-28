
export type Product = {
  id: string;
  name: { de: string; en: string };
  price: number;
  unit: 'Stück' | 'Einheit';
  categoryId: string;
  imageUrl: string;
  taxRate: number;
  sku: string;
  isAvailable: boolean;
};

export type CartItem = Product & { cartId: string; quantity: number };

export type Category = {
    id: string;
    name: { de: string, en: string };
    sort: number;
    icon: string;
}
