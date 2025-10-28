"use client";
import { useState } from "react";
import CartPanel from "./components/CartPanel";
import ProductGrid from "./components/ProductGrid";
import ModeSwitcher from "./components/ModeSwitcher";
import TableMap from "./components/TableMap";
import { Product, CartItem } from "./types";
import { translations } from '@/lib/pos-translations';
import { useCashDrawer } from '@/hooks/use-cash-drawer';
import CashDrawerDialog from '@/components/pos/CashDrawerDialog';
import PaymentDialog from '@/components/pos/PaymentDialog';
import { Button } from '@/components/ui/button';
import { Landmark } from 'lucide-react';
import QRCode from 'qrcode.react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const mockProducts: Product[] = [
  {
    id: '1',
    name: { de: 'Schreibtischlampe', en: 'Desk Lamp' },
    price: 46.0,
    image: 'https://picsum.photos/seed/lamp/400/400',
    category: 'Möbel',
    isAvailable: true,
    quantity: 10,
    taxRate: 0.19,
    sku: 'SKU-LAMP-01',
  },
  {
    id: '2',
    name: { de: 'Ablagebox', en: 'Storage Box' },
    price: 18.17,
    image: 'https://picsum.photos/seed/box/400/400',
    category: 'Möbel',
    isAvailable: true,
    quantity: 25,
    taxRate: 0.19,
    sku: 'SKU-BOX-02',
  },
  {
    id: '3',
    name: { de: 'Briefablage', en: 'Letter Tray' },
    price: 5.52,
    image: 'https://picsum.photos/seed/tray/400/400',
    category: 'Büro',
    isAvailable: false,
    quantity: 0,
    taxRate: 0.19,
    sku: 'SKU-TRAY-03',
  },
];


export default function POSPage() {
  const [mode, setMode] = useState<"retail" | "restaurant">("retail");
  const [language, setLanguage] = useState<'de' | 'en'>('de');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  
  const { openDrawerDialog } = useCashDrawer();
  const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);


  useState(() => {
    const storedTenantId = localStorage.getItem('tenantId');
    setTenantId(storedTenantId);
  });
  
  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevCart, { ...product, cartId: `${product.id}-${Date.now()}`, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (cartId: string) => {
    setCart(prevCart => prevCart.filter(item => item.cartId !== cartId));
  };
  
  const clearCart = () => {
    setCart([]);
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePaymentSuccess = (qrData: string) => {
    setQrCodeData(qrData);
    clearCart();
    setActiveTransactionId(null);
  };

  if (qrCodeData) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background">
        <Card className="p-8 text-center">
            <CardHeader>
                <CardTitle>Payment Successful!</CardTitle>
                <CardDescription>Scan the QR code on your RKSV device.</CardDescription>
            </CardHeader>
            <CardContent>
                <QRCode value={qrCodeData} size={256} />
            </CardContent>
            <CardFooter>
                 <Button onClick={() => setQrCodeData(null)} className="w-full">New Order</Button>
            </CardFooter>
        </Card>
      </div>
    );
  }


  return (
    <div className="grid grid-cols-12 h-screen bg-card text-card-foreground">
      <div className="col-span-4 bg-background border-r flex flex-col">
        <div className="p-4 border-b">
           <Button onClick={openDrawerDialog} variant="outline" className="w-full">
                <Landmark className="mr-2 h-4 w-4" />
                Cash Drawer
            </Button>
        </div>
        <CartPanel
          cart={cart}
          language={language}
          removeFromCart={removeFromCart}
          clearCart={clearCart}
          onPay={() => setPaymentDialogOpen(true)}
          total={total}
          setCart={setCart}
          setTransactionId={setActiveTransactionId}
        />
      </div>

      <div className="col-span-8 flex flex-col">
        <header className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Point of Sale</h2>
          <ModeSwitcher mode={mode} setMode={setMode} />
        </header>

        <main className="flex-1 overflow-auto p-4">
           {mode === "restaurant" ? (
             <div className="grid grid-cols-12 gap-6">
                <div className="col-span-5"><TableMap /></div>
                <div className="col-span-7"><ProductGrid products={mockProducts} addToCart={addToCart} language={language} /></div>
              </div>
            ) : (
             <ProductGrid products={mockProducts} addToCart={addToCart} language={language} />
           )}
        </main>
      </div>
      
       <CashDrawerDialog />
       {activeTransactionId && tenantId && (
        <PaymentDialog 
            open={isPaymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            total={total}
            tenantId={tenantId}
            transactionId={activeTransactionId}
            onPaymentSuccess={handlePaymentSuccess}
        />
       )}
    </div>
  );
}
