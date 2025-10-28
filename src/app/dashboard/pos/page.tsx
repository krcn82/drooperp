"use client";
import { useState, useEffect } from "react";
import CartPanel from "./components/CartPanel";
import ProductGrid from "./components/ProductGrid";
import ModeSwitcher from "./components/ModeSwitcher";
import TableMap from "./components/TableMap";
import CategoryTabs from "./components/CategoryTabs";
import { type Product, type CartItem } from "./types";
import { translations } from '@/lib/pos-translations';
import { useCashDrawer } from '@/hooks/use-cash-drawer';
import CashDrawerDialog from '@/components/pos/CashDrawerDialog';
import PaymentDialog from '@/components/pos/PaymentDialog';
import { Button } from '@/components/ui/button';
import { Landmark } from 'lucide-react';
import QRCode from 'qrcode.react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function POSPage() {
  const [mode, setMode] = useState<"retail" | "restaurant">("retail");
  const [language, setLanguage] = useState<'de' | 'en'>('de');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const { openDrawerDialog } = useCashDrawer();
  const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);


  useEffect(() => {
    const storedTenantId = localStorage.getItem('tenantId');
    setTenantId(storedTenantId);
  }, []);
  
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

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxes = cart.reduce((sum, item) => sum + (item.price * item.quantity * item.taxRate), 0);
  const total = subtotal + taxes;


  const handlePaymentSuccess = (qrData: string) => {
    setQrCodeData(qrData);
    clearCart();
    setActiveTransactionId(null);
    setPaymentDialogOpen(false);
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
          mode={mode}
        />
      </div>

      <div className="col-span-8 flex flex-col">
        <header className="p-4 border-b flex justify-between items-center gap-4">
          {tenantId && <CategoryTabs tenantId={tenantId} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} language={language} />}
          <div className="flex-grow"></div>
          <ModeSwitcher mode={mode} setMode={setMode} />
        </header>

        <main className="flex-1 overflow-auto p-4">
           {mode === "restaurant" ? (
             <div className="grid grid-cols-12 gap-6">
                <div className="col-span-5"><TableMap /></div>
                <div className="col-span-7">
                  {tenantId && <ProductGrid tenantId={tenantId} categoryId={selectedCategory} addToCart={addToCart} language={language} />}
                </div>
              </div>
            ) : (
             tenantId && <ProductGrid tenantId={tenantId} categoryId={selectedCategory} addToCart={addToCart} language={language} />
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
