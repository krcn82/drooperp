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
import { cn } from '@/lib/utils';
import { processPayment } from '@/app/dashboard/pos/actions';
import { useToast } from '@/hooks/use-toast';

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
  const [view, setView] = useState<'select' | 'cash' | 'terminal' | 'stripe'>('select');
  const [cashReceived, setCashReceived] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const change = (parseFloat(cashReceived) || 0) - total;

  const handleMethodSelect = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        setView('cash');
        setCashReceived(total.toFixed(2));
        break;
      case 'card':
      case 'bankomat':
        setView('terminal');
        handleTerminalPayment(method);
        break;
      case 'stripe':
        setView('stripe');
        // Stripe payment logic would be initiated here
        break;
    }
  };

  const handleCashPayment = async () => {
    if (change < 0) {
      toast({ variant: 'destructive', title: 'Insufficient cash received.' });
      return;
    }
    setIsLoading(true);
    const result = await processPayment(tenantId, transactionId, { method: 'cash', amount: total });
    if (result.success && result.qrCode) {
      toast({ title: 'Payment Successful', description: `Change: $${change.toFixed(2)}` });
      onPaymentSuccess(result.qrCode);
      resetState();
    } else {
      toast({ variant: 'destructive', title: 'Payment Failed', description: result.message });
    }
    setIsLoading(false);
  };
  
  const handleTerminalPayment = async (method: 'card' | 'bankomat') => {
      setIsLoading(true);
      // Simulate waiting for terminal
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const result = await processPayment(tenantId, transactionId, { method: method, amount: total });
      
      if (result.success && result.qrCode) {
          toast({ title: 'Payment Approved', description: 'Terminal payment successful.' });
          onPaymentSuccess(result.qrCode);
          resetState();
      } else {
          toast({ variant: 'destructive', title: 'Payment Failed', description: result.message || 'Terminal was declined or failed.' });
      }
      setIsLoading(false);
  }

  const resetState = () => {
    setView('select');
    setCashReceived('');
    setIsLoading(false);
  };

  const handleClose = () => {
    if (!isLoading) {
      resetState();
      onOpenChange(false);
    }
  };
  
  const handleCashInput = (value: string) => {
    if (cashReceived.includes('.') && value === '.') return;
    if (cashReceived.split('.')[1]?.length >= 2) return;
    setCashReceived(cashReceived + value);
  }

  const renderContent = () => {
    switch (view) {
      case 'cash':
        return (
          <div>
            <div className="text-center my-4">
              <p className="text-muted-foreground">Amount Due</p>
              <p className="text-4xl font-bold">${total.toFixed(2)}</p>
            </div>
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-muted-foreground">Amount Received</p>
              <p className="text-6xl font-bold font-mono tracking-tighter break-all">${cashReceived || '0.00'}</p>
            </div>
             <div className="grid grid-cols-3 gap-2 mt-4">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map(val => (
                    <Button key={val} variant="outline" className="h-16 text-2xl" onClick={() => handleCashInput(val)}>{val}</Button>
                ))}
                <Button variant="outline" className="h-16 text-2xl" onClick={() => setCashReceived(cashReceived.slice(0, -1))}>⌫</Button>
            </div>
            <div className="mt-4 text-center">
                <p className="text-muted-foreground">Change Due</p>
                <p className={cn("text-3xl font-bold", change < 0 ? "text-destructive" : "text-green-600")}>
                    ${change.toFixed(2)}
                </p>
            </div>
            <DialogFooter className="mt-6">
                <Button variant="ghost" onClick={() => setView('select')}>Back</Button>
                <Button className="w-full" onClick={handleCashPayment} disabled={isLoading || change < 0}>
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Confirm Cash Payment'}
                </Button>
            </DialogFooter>
          </div>
        );
      case 'terminal':
        return (
            <div className="text-center py-12">
                <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
                <p className="mt-4 text-lg font-semibold">Waiting for terminal response...</p>
                <p className="text-muted-foreground">Please complete the transaction on the device.</p>
            </div>
        );
      case 'stripe':
        return (
            <div className="text-center py-12">
                <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">(Stripe Payment iframe would be here)</p>
                </div>
                 <DialogFooter className="mt-6">
                    <Button variant="ghost" onClick={() => setView('select')}>Back</Button>
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
              >
                <span className="text-4xl">{method.emoji}</span>
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
          <DialogDescription>Total Amount: ${total.toFixed(2)}</DialogDescription>
        </DialogHeader>
        <div className="py-4">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}
