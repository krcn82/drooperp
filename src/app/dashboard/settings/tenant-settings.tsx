'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createNewTenant } from './tenant-actions';
import TenantCard from './tenant-card';
import ModuleSettings from './module-settings';
import { Separator } from '@/components/ui/separator';

export type Tenant = {
  id: string;
  name: string;
  ownerUid: string;
  createdAt: Timestamp;
  plan: 'free' | 'standard' | 'custom';
  status: 'active' | 'inactive' | 'deleted';
};

export default function TenantSettings() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const tenantsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'tenants'), where('ownerUid', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: tenants, isLoading, error } = useCollection<Tenant>(tenantsQuery);

  useEffect(() => {
    const currentTenantId = localStorage.getItem('tenantId');
    if (tenants && !selectedTenant) {
        const activeTenant = tenants.find(t => t.id === currentTenantId);
        setSelectedTenant(activeTenant || tenants[0] || null);
    }
  }, [tenants, selectedTenant]);


  const handleCreateTenant = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    if (!newTenantName.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Company name cannot be empty.' });
      return;
    }
    
    setIsSubmitting(true);
    const result = await createNewTenant(newTenantName, { uid: user.uid, email: user.email });
    
    if (result.success) {
      toast({ title: 'Success', description: `Tenant '${newTenantName}' created successfully.` });
      setNewTenantName('');
      setModalOpen(false);
    } else {
      toast({ variant: 'destructive', title: 'Creation Failed', description: result.message });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                <CardTitle>Tenant Management</CardTitle>
                <CardDescription>Manage all companies you own.</CardDescription>
                </div>
                <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
                <DialogTrigger asChild>
                    <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Tenant
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Create a New Company</DialogTitle>
                    <DialogDescription>
                        This will create a new, separate company under your account.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tenant-name" className="text-right">
                        Company Name
                        </Label>
                        <Input
                        id="tenant-name"
                        value={newTenantName}
                        onChange={(e) => setNewTenantName(e.target.value)}
                        className="col-span-3"
                        placeholder="e.g., Acme Inc."
                        />
                    </div>
                    </div>
                    <DialogFooter>
                    <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateTenant} disabled={isSubmitting || !newTenantName}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Tenant
                    </Button>
                    </DialogFooter>
                </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading && <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>}
                {error && <div className="text-destructive">Error loading tenants: {error.message}</div>}
                {!isLoading && tenants && tenants.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                    {tenants.map(tenant => (
                    <div key={tenant.id} onClick={() => setSelectedTenant(tenant)}>
                        <TenantCard tenant={tenant} />
                    </div>
                    ))}
                </div>
                )}
                {!isLoading && tenants && tenants.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                        <p>You don't own any tenants yet. Create one to get started.</p>
                    </div>
                )}
            </CardContent>
        </Card>
        
        {selectedTenant && (
            <>
                <Separator />
                <ModuleSettings key={selectedTenant.id} tenant={selectedTenant} />
            </>
        )}
    </div>
  );
}
