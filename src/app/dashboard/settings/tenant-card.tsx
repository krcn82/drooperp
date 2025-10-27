'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Users, FileText, ArrowRight, Trash2, ArrowUp, Loader2 } from 'lucide-react';
import { type Tenant } from './tenant-settings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { switchTenant, updateTenantStatus } from './tenant-actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type TenantCardProps = {
  tenant: Tenant;
};

export default function TenantCard({ tenant }: TenantCardProps) {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const currentTenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
  const isActive = tenant.id === currentTenantId;

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `tenants/${tenant.id}/users`);
  }, [firestore, tenant.id]);
  const { data: users, isLoading: usersLoading } = useCollection(usersQuery);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `tenants/${tenant.id}/transactions`);
  }, [firestore, tenant.id]);
  const { data: transactions, isLoading: transactionsLoading } = useCollection(transactionsQuery);

  const handleSwitch = async () => {
    const result = await switchTenant(tenant.id);
    if (result.success) {
        toast({ title: 'Switched Tenant', description: `You are now managing ${tenant.name}.`});
        router.refresh();
    } else {
        toast({ variant: 'destructive', title: 'Failed to Switch', description: result.message });
    }
  };

  const handleDelete = async () => {
    const result = await updateTenantStatus(tenant.id, 'deleted');
     if (result.success) {
        toast({ title: 'Tenant Deleted', description: `${tenant.name} has been marked for deletion.`});
    } else {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: result.message });
    }
  };

  const handleUpgrade = () => {
      // Placeholder for plan upgrade logic
      toast({ title: 'Not Implemented', description: 'Plan upgrade functionality is not yet available.'})
  }

  const getStatusVariant = (status: Tenant['status']) => {
    switch(status) {
        case 'active': return 'default';
        case 'inactive': return 'secondary';
        case 'deleted': return 'destructive';
        default: return 'outline';
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle>{tenant.name}</CardTitle>
            <Badge variant={getStatusVariant(tenant.status)} className="capitalize">{tenant.status}</Badge>
        </div>
        <CardDescription>
          Plan: <span className="font-semibold capitalize">{tenant.plan}</span> | Created: {tenant.createdAt.toDate().toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Users:</span>
            {usersLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <span className="font-bold">{users?.length || 0}</span>}
        </div>
        <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>Transactions:</span>
            {transactionsLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <span className="font-bold">{transactions?.length || 0}</span>}
        </div>
      </CardContent>
      <CardFooter className="flex-wrap gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handleUpgrade}><ArrowUp className="mr-2 h-4 w-4"/> Upgrade</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isActive}><Trash2 className="mr-2 h-4 w-4"/> Delete</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the tenant and block all access. This action can be undone by contacting support.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Yes, delete tenant</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button onClick={handleSwitch} disabled={isActive} className="bg-accent hover:bg-accent/90">
            {isActive ? 'Active' : 'Switch to Tenant'}
            {!isActive && <ArrowRight className="ml-2 h-4 w-4"/>}
        </Button>
      </CardFooter>
    </Card>
  );
}
