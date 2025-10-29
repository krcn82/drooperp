
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Landmark, CreditCard, Wallet, MonitorSmartphone, User, Search, Gift } from 'lucide-react';
import { processPayment } from '@/app/dashboard/pos/actions';
import { useToast } from '@/hooks/use-toast';
import { useCashDrawer } from '@/hooks/use-cash-drawer';
import { useFirebaseApp, setDocumentNonBlocking } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc } from 'firebase/firestore';

type PaymentMethod = 'cash' | 'card' | 'bankomat' | 'stripe';

interface CustomerData {
    fullName: string;
    loyaltyPoints: number;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  tenantId: string;
  transactionId: string;
  onPaymentSuccess: (qrCode: string) => void;
  selectedCustomer: { id: string; fullName: string } | null;
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
  selectedCustomer,
}: PaymentDialogProps) {
  const [view, setView] = useState<'select' | 'terminal' | 'stripe'>('select');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);
  const { toast } = useToast();
  const { id: cashRegisterId } = useCashDrawer();
  const { firebaseApp, firestore } = useFirebaseApp();

  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [discountedTotal, setDiscountedTotal] = useState(total);

  const displayRef = firestore ? doc(firestore, `tenants/${tenantId}/display/current`) : null;
  
  useEffect(() => {
    setDiscountedTotal(total);
    setCustomerData(null);
    if (open) {
      if (displayRef) {
        setDocumentNonBlocking(displayRef, { total: total, status: 'idle', customer: null }, { merge: true });
      }
      if (selectedCustomer?.id) {
          fetchLoyalty(selectedCustomer.id);
      }
    }
  }, [open, total, selectedCustomer]);


  const fetchLoyalty = async (customerId: string) => {
    if (!firebaseApp || !displayRef) return;
    setIsCheckingCustomer(true);
    const functions = getFunctions(firebaseApp);
    const getLoyalty = httpsCallable< { tenantId: string; customerId: string }, CustomerData>(functions, 'getCustomerLoyalty');
    try {
      const res = await getLoyalty({ tenantId, customerId });
      setCustomerData(res.data);
      
      const bonusActive = res.data.loyaltyPoints >= 100;
      let finalTotal = total;

      const customerDisplayData = {
          name: res.data.fullName,
          loyaltyPoints: res.data.loyaltyPoints,
          bonusActive: bonusActive,
      };

      if (bonusActive) {
        const discount = total * 0.05;
        finalTotal = total - discount;
        setDiscountedTotal(finalTotal);
        toast({
          className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300',
          title: "🎉 5% Bonus Applied!",
          description: `Discount of €${discount.toFixed(2)} applied for being a loyal customer.`
        });
      }
      
      setDocumentNonBlocking(displayRef, { customer: customerDisplayData, total: finalTotal }, { merge: true });
      
    } catch (err: any) {
      toast({
          variant: 'destructive',
          title: "Customer Not Found",
          description: "Could not retrieve loyalty information for this customer.",
      });
      setDocumentNonBlocking(displayRef, { customer: null }, { merge: true });
    } finally {
        setIsCheckingCustomer(false);
    }
  };

  const completePayment = async (method: PaymentMethod) => {
    setIsLoading(true);
    if (displayRef) {
        setDocumentNonBlocking(displayRef, { status: 'processing' }, { merge: true });
    }
    const finalAmount = discountedTotal;
    const paymentData = { method, amount: finalAmount, cashRegisterId };
    
    const paymentResult = await processPayment(tenantId, transactionId, paymentData);

    if (!paymentResult.success) {
      toast({ variant: 'destructive', title: 'Payment Error', description: paymentResult.message });
      if (displayRef) {
        setDocumentNonBlocking(displayRef, { status: 'idle' }, { merge: true });
      }
      setIsLoading(false);
      return;
    }
    
    if (selectedCustomer?.id && firebaseApp) {
        const functions = getFunctions(firebaseApp);
        const updateLoyalty = httpsCallable(functions, "updateLoyaltyPoints");
        try {
            const loyaltyResult: any = await updateLoyalty({
                tenantId,
                customerId: selectedCustomer.id,
                orderId: transactionId,
                totalAmount: finalAmount,
            });
            if(loyaltyResult.data.pointsEarned > 0) {
               toast({ title: 'Loyalty Updated', description: `Added ${loyaltyResult.data.pointsEarned} points.` });
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Loyalty Update Failed', description: err.message });
        }
    }
    
    if (displayRef) {
      setDocumentNonBlocking(displayRef, { status: 'completed' }, { merge: true });
      setTimeout(() => setDocumentNonBlocking(displayRef, { status: 'idle', total: 0, customer: null }, { merge: true }), 5000);
    }

    setIsLoading(false);
    onPaymentSuccess(paymentResult.qrCode || 'payment-success-qr');
    resetState();
  };

  const resetState = () => {
    setView('select');
    setIsLoading(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isLoading) {
      if (displayRef) {
        setDocumentNonBlocking(displayRef, { status: 'idle', total: 0, customer: null }, { merge: true });
      }
      setView('select');
      onOpenChange(false);
    }
  };
  
  const currentTotal = customerData && discountedTotal !== total ? discountedTotal : total;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">🧾 Payment & Loyalty</DialogTitle>
          <DialogDescription>Total Amount: €{currentTotal.toFixed(2)}</DialogDescription>
        </DialogHeader>

        {selectedCustomer && (customerData || isCheckingCustomer) && (
             <div className="text-center text-card-foreground p-4 bg-muted rounded-lg">
                {isCheckingCustomer ? <Loader2 className="animate-spin mx-auto"/> : (
                    <>
                        <p className="font-semibold text-lg">{customerData?.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                            Current Points: {customerData?.loyaltyPoints}
                        </p>
                        {customerData && customerData.loyaltyPoints >= 100 && (
                            <p className="text-green-600 font-medium mt-1 flex items-center justify-center gap-1">
                            <Gift size={16} /> 5% Bonus Activated
                            </p>
                        )}
                    </>
                )}
            </div>
        )}
        
        {view === 'select' ? (
             <div className="grid grid-cols-2 gap-4 py-4">
                {paymentMethods.map(method => (
                  <Button
                    key={method.id}
                    variant="outline"
                    className="h-28 flex flex-col gap-2 text-lg"
                    onClick={() => completePayment(method.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin" /> : <span className="text-4xl">{method.emoji}</span>}
                    {method.name}
                  </Button>
                ))}
              </div>
        ) : (
             <div className="text-center py-12">
                <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
                <p className="mt-4 text-lg font-semibold">Waiting for terminal response...</p>
                <p className="text-muted-foreground">Please complete the transaction on the device.</p>
                <Button variant="ghost" className="mt-4" onClick={() => { setView('select'); setIsLoading(false); }}>Cancel</Button>
            </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
