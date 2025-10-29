
'use client';

import React, { useState } from 'react';
import { translations } from '@/lib/pos-translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, User, UserPlus } from 'lucide-react';
import { type CartItem, type Customer } from '../types';
import { recordTransaction } from '../actions';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import CustomerPicker from './CustomerPicker';
import LoyaltyBadge from './LoyaltyBadge';

interface CartPanelProps {
  cart: CartItem[];
  language: 'de' | 'en';
  removeFromCart: (cartId: string) => void;
  clearCart: () => void;
  onPay: (customer: Customer | null) => void;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setTransactionId: (id: string) => void;
  mode: 'retail' | 'restaurant';
  tenantId: string;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
}

export default function CartPanel({
  cart,
  language,
  removeFromCart,
  clearCart,
  onPay,
  setCart,
  setTransactionId,
  mode,
  tenantId,
  selectedCustomer,
  setSelectedCustomer
}: CartPanelProps) {
  const t = translations[language];
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomerPickerOpen, setCustomerPickerOpen] = useState(false);

  const handleQuantityChange = (cartId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartId);
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.cartId === cartId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const handlePayClick = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not logged in',
        description: 'You must be logged in to process a transaction.',
      });
      return;
    }

    if (!tenantId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Tenant ID not found.',
      });
      return;
    }

    setIsSubmitting(true);

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxes = cart.reduce((sum, item) => sum + (item.price * item.quantity * (item.taxRate || 0)), 0);

    const transactionData = {
      mode: mode,
      items: cart.map(item => ({
        productId: item.id,
        name: { de: item.name.de, en: item.name.en },
        qty: item.quantity,
        price: item.price,
        taxRate: item.taxRate || 0
      })),
      totals: {
        subtotal: subtotal,
        taxes: taxes,
        grandTotal: subtotal + taxes
      },
      cashierUserId: user.uid,
      customerId: selectedCustomer?.id || null,
    };

    const result = await recordTransaction(tenantId, transactionData);

    if (result.success && result.transactionId) {
      setTransactionId(result.transactionId);
      onPay(selectedCustomer);
    } else {
      toast({
        variant: 'destructive',
        title: 'Transaction Failed',
        description: result.message || 'Could not create the transaction record.',
      });
    }

    setIsSubmitting(false);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxes = cart.reduce((sum, item) => sum + (item.price * item.quantity * (item.taxRate || 0)), 0);
  const grandTotal = subtotal + taxes;

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
          {selectedCustomer ? (
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-primary"/>
              <div>
                <p className="font-semibold">{selectedCustomer.fullName}</p>
                <LoyaltyBadge vipTier={selectedCustomer.vipTier} loyaltyPoints={selectedCustomer.loyaltyPoints} />
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>✕</Button>
            </div>
          ) : (
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setCustomerPickerOpen(true)}>
              <UserPlus className="h-6 w-6" />
              <span>{t.customer}</span>
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">{t.cart} ist leer.</p>
            ) : (
              cart.map(item => (
                <div key={item.cartId} className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.cartId, parseInt(e.target.value))}
                    className="w-16 text-center"
                    min="1"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item.name[language]}</p>
                    <p className="text-sm text-muted-foreground">€ {item.price.toFixed(2)}</p>
                  </div>
                  <p className="font-bold">€ {(item.price * item.quantity).toFixed(2)}</p>
                  <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.cartId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-4 mt-auto border-t space-y-4 bg-background">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>€ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.taxes}</span>
              <span>€ {taxes.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-lg font-bold">
            <span>{t.total}</span>
            <span>€ {grandTotal.toFixed(2)}</span>
          </div>
          <Button className="w-full h-16 text-xl bg-accent hover:bg-accent/90" onClick={handlePayClick} disabled={cart.length === 0 || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            💳 {t.pay}
          </Button>
        </div>
      </div>
      <CustomerPicker 
        open={isCustomerPickerOpen}
        onOpenChange={setCustomerPickerOpen}
        tenantId={tenantId}
        onSelectCustomer={(customer) => {
            setSelectedCustomer(customer);
            setCustomerPickerOpen(false);
        }}
      />
    </>
  );
}
