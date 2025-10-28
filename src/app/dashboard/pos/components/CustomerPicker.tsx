
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, or } from 'firebase/firestore';
import { type Customer } from '../types';
import { Loader2, UserPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CustomerPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onSelectCustomer: (customer: Customer) => void;
}

export default function CustomerPicker({ open, onOpenChange, tenantId, onSelectCustomer }: CustomerPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const firestore = useFirestore();

  const customersQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId || !searchTerm) return null;
    
    // This is a simple prefix search. For production, you would want a more robust search solution like Algolia.
    const q = query(
      collection(firestore, `tenants/${tenantId}/customers`),
      or(
        where('fullName', '>=', searchTerm),
        where('fullName', '<=', searchTerm + '\uf8ff')
      )
    );
    return q;
  }, [firestore, tenantId, searchTerm]);

  const { data: customers, isLoading } = useCollection<Customer>(customersQuery);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Customer</DialogTitle>
          <DialogDescription>Search for an existing customer or add a new one.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <ScrollArea className="h-72 mt-4">
            <div className="space-y-2">
                {isLoading && <div className="flex justify-center p-4"><Loader2 className="animate-spin"/></div>}
                {!isLoading && customers?.map(customer => (
                    <div
                        key={customer.id}
                        className="p-3 rounded-md hover:bg-muted cursor-pointer"
                        onClick={() => onSelectCustomer(customer)}
                    >
                        <p className="font-semibold">{customer.fullName}</p>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                    </div>
                ))}
                 {!isLoading && !customers?.length && searchTerm && (
                    <p className="text-center text-muted-foreground p-4">No customers found.</p>
                )}
            </div>
          </ScrollArea>
        </div>
        <DialogHeader>
          <Button variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            Add New Customer
          </Button>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

