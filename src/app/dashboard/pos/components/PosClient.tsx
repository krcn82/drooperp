
'use client';

import { useState, useEffect, ReactNode } from "react";
import { type Product, type CartItem, type Customer } from "../types";
import { useCashDrawer } from '@/hooks/use-cash-drawer';
import PaymentDialog from '@/components/pos/PaymentDialog';
import { Button } from '@/components/ui/button';
import { Landmark } from 'lucide-react';
import QRCode from 'qrcode.react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface PosClientProps {
    children: (props: {
        tenantId: string | null;
        language: 'de' | 'en';
        selectedCategory: string | null;
        setSelectedCategory: (id: string | null) => void;
        addToCart: (product: Product) => void;
        cart: CartItem[];
        setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
        removeFromCart: (cartId: string) => void;
        clearCart: () => void;
        setTransactionId: (id: string) => void;
        onPay: (customer: Customer | null) => void;
        selectedCustomer: Customer | null;
        setSelectedCustomer: (customer: Customer | null) => void;
    }) => ReactNode;
    posMode: 'retail' | 'restaurant';
}

export default function PosClient({ children, posMode }: PosClientProps) {
    const [language, setLanguage] = useState<'de' | 'en'>('de');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    
    const { openDrawerDialog } = useCashDrawer();
    const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
    const [qrCodeData, setQrCodeData] = useState<string | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
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
      setSelectedCustomer(null);
    }
  
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxes = cart.reduce((sum, item) => sum + (item.price * item.quantity * (item.taxRate || 0)), 0);
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

    const childProps = {
        tenantId,
        language,
        selectedCategory,
        setSelectedCategory,
        addToCart,
        cart,
        setCart,
        removeFromCart,
        clearCart,
        setTransactionId: setActiveTransactionId,
        onPay: () => setPaymentDialogOpen(true),
        selectedCustomer,
        setSelectedCustomer,
    };
  
    return (
        <>
            {children(childProps)}
            {activeTransactionId && tenantId && (
                <PaymentDialog 
                    open={isPaymentDialogOpen}
                    onOpenChange={setPaymentDialogOpen}
                    total={total}
                    tenantId={tenantId}
                    transactionId={activeTransactionId}
                    onPaymentSuccess={handlePaymentSuccess}
                    selectedCustomer={selectedCustomer}
                />
            )}
        </>
    );
}
