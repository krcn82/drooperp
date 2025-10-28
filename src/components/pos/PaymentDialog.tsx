'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Landmark, CreditCard, Wallet, MonitorSmartphone } from 'lucide-react';
import { processPayment } from '@/app/dashboard/pos/actions';
import { useToast } from '@/hooks/use-toast';
import { useCashDrawer } from '@/hooks/use-cash-drawer';

type PaymentMethod = 'cash' | 'card' | 'bankomat' | 'stripe';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  tenantId: string;
  transactionId: string;
  onPaymentSuccess: (qrCode: string) => void;
}

const paymentMethods: { id: PaymentMethod; name: string; icon: React.ElementType, emoji: string }[] = [
  { id: 'cash', name: 'Cash', icon: Wallet, emoji: '💶' },
  { id: 'card', name: 'Card', icon: CreditCard, emoji: '💳' },
  { id: 'bankomat', name: 'Bankomat', icon: Landmark, emoji: '🏧' },
  { id: 'stripe', name: 'Stripe', icon: MonitorSmartphone, emoji: '🌐' },
];

export default function PaymentDialog({
  open,
  onOpenChange,
  total,
  tenantId,
  transactionId,
  onPaymentSuccess,
}: PaymentDialogProps) {
  const [view, setView] = useState<'select' | 'terminal' | 'stripe'>('select');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { id: cashRegisterId } = useCashDrawer();

  const handleMethodSelect = async (method: PaymentMethod) => {
    setIsLoading(true);
    const paymentData = { method, amount: total, cashRegisterId };
    const result = await processPayment(tenantId, transactionId, paymentData);
    setIsLoading(false);

    if (!result.success) {
      toast({ variant: 'destructive', title: 'Payment Error', description: result.message });
      return;
    }

    switch (method) {
      case 'cash':
        toast({ title: 'Payment Successful', description: 'Cash payment recorded.' });
        onPaymentSuccess(result.qrCode || 'cash-qr-placeholder');
        resetState();
        break;
      case 'card':
      case 'bankomat':
        setView('terminal');
        toast({ title: 'Device Notified', description: 'Please complete payment on the terminal.' });
        // For demonstration, we'll simulate a delay then success.
        // A real implementation would listen for a webhook or Firestore update.
        setTimeout(() => {
           onPaymentSuccess('terminal-payment-placeholder-qr');
           resetState();
        }, 8000);
        break;
      case 'stripe':
        setView('stripe');
        toast({ title: 'Stripe Initialized', description: 'Complete payment in the Stripe UI.' });
        // In a real app, you would use result.clientSecret with Stripe.js here.
        setTimeout(() => {
          onPaymentSuccess('stripe-payment-successful-qr-placeholder');
          resetState();
        }, 5000);
        break;
    }
  };

  const resetState = () => {
    setView('select');
    setIsLoading(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isLoading) {
      setView('select');
      onOpenChange(false);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'terminal':
        return (
            <div className="text-center py-12">
                <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
                <p className="mt-4 text-lg font-semibold">Waiting for terminal response...</p>
                <p className="text-muted-foreground">Please complete the transaction on the device.</p>
                <Button variant="ghost" className="mt-4" onClick={() => { setView('select'); setIsLoading(false); }}>Cancel</Button>
            </div>
        );
      case 'stripe':
        return (
            <div className="text-center py-12">
                 <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
                <p className="mt-4 text-lg font-semibold">Connecting to Stripe...</p>
                <p className="text-muted-foreground">Please wait while we initialize the payment.</p>
                <DialogFooter className="mt-6">
                    <Button variant="ghost" onClick={() => { setView('select'); setIsLoading(false); }} disabled={isLoading}>Back</Button>
                </DialogFooter>
            </div>
        );
      case 'select':
      default:
        return (
          <div className="grid grid-cols-2 gap-4">
            {paymentMethods.map(method => (
              <Button
                key={method.id}
                variant="outline"
                className="h-28 flex flex-col gap-2 text-lg"
                onClick={() => handleMethodSelect(method.id)}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <span className="text-4xl">{method.emoji}</span>}
                {method.name}
              </Button>
            ))}
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Payment Method</DialogTitle>
          <DialogDescription>Total Amount: €{total.toFixed(2)}</DialogDescription>
        </DialogHeader>
        <div className="py-4">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}
