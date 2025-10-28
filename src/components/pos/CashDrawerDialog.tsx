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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Landmark, LogOut, Check } from 'lucide-react';
import { useCashDrawer } from '@/hooks/use-cash-drawer';
import { useUser, useFirebaseApp } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function CashDrawerDialog() {
  const { user } = useUser();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  const { isDialogOpen, closeDrawerDialog, openNewSession, closeCurrentSession, isOpen, id: cashRegisterId } = useCashDrawer();

  const [openingBalance, setOpeningBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenSession = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    const balance = parseFloat(openingBalance);
    if (isNaN(balance)) {
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid opening balance.' });
      return;
    }
    
    setIsSubmitting(true);
    await openNewSession(balance, user.uid, user.displayName || user.email!);
    setIsSubmitting(false);
    setOpeningBalance('');
    closeDrawerDialog();
  };

  const handleCloseSession = async () => {
    if (!firebaseApp || !cashRegisterId) return;
    
    setIsSubmitting(true);
    const functions = getFunctions(firebaseApp);
    const generateZReport = httpsCallable(functions, 'generateZReport');
    
    try {
        const result: any = await generateZReport({ 
            tenantId: localStorage.getItem('tenantId'), 
            cashRegisterId 
        });
        
        if (result.data.success) {
            toast({ title: 'Session Closed', description: 'Z-Report has been generated.' });
            closeCurrentSession();
        } else {
            toast({ variant: 'destructive', title: 'Failed to Close', description: result.data.message });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Cloud Function Error', description: error.message });
    }

    setIsSubmitting(false);
    closeDrawerDialog();
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={closeDrawerDialog}>
      <DialogContent>
        {isOpen ? (
          <>
            <DialogHeader>
              <DialogTitle>Close Cash Drawer</DialogTitle>
              <DialogDescription>
                End the current sales session and generate a Z-Report.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <p>Are you sure you want to close this session? All sales data will be finalized.</p>
                {/* We can add expected cash amount here later */}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={closeDrawerDialog}>Cancel</Button>
              <Button variant="destructive" onClick={handleCloseSession} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <LogOut className="mr-2 h-4 w-4" />
                Close Session & Generate Report
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Open Cash Drawer</DialogTitle>
              <DialogDescription>
                Start a new sales session by declaring your opening cash balance.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="opening-balance" className="text-right">
                  Opening Balance
                </Label>
                <Input
                  id="opening-balance"
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., 150.00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={closeDrawerDialog}>Cancel</Button>
              <Button onClick={handleOpenSession} disabled={isSubmitting || !openingBalance}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 <Check className="mr-2 h-4 w-4" />
                Start Session
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
