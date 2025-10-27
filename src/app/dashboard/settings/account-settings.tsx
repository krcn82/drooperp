'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
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
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

type Tenant = {
  id: string;
  name: string;
  createdAt: Timestamp;
};

export default function AccountSettings() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    const storedTenantId = localStorage.getItem('tenantId');
    setTenantId(storedTenantId);
  }, []);

  const tenantRef = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return doc(firestore, 'tenants', tenantId);
  }, [firestore, tenantId]);

  const { data: tenant, isLoading: isTenantLoading } = useDoc<Tenant>(tenantRef);

  const handleExport = () => {
    // In a real app, this would trigger a Cloud Function to generate a GDPR-compliant data export.
    console.log("Exporting data for user:", user?.uid);
    console.log("User data:", user);
    console.log("Tenant data:", tenant);
    toast({
      title: "Data Export Requested",
      description: "Your data export is being generated and will be emailed to you.",
    });
  };

  const handleDelete = () => {
    // This would call a `deleteUserData` Cloud Function.
    // As a placeholder, we'll just show a toast.
    console.warn(`Critical action: Deleting user ${user?.uid} and all associated data.`);
    toast({
      variant: 'destructive',
      title: "Account Deletion Initiated",
      description: "Your account is scheduled for deletion.",
    });
  };

  const InfoRow = ({ label, value, loading }: { label: string; value: string | undefined; loading: boolean }) => (
    <div className="flex justify-between items-center py-3 border-b">
      <span className="text-sm text-muted-foreground">{label}</span>
      {loading ? <Skeleton className="h-5 w-48" /> : <span className="text-sm font-medium">{value}</span>}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>View and manage your personal account details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <InfoRow label="Email" value={user?.email || undefined} loading={isTenantLoading} />
        <InfoRow label="Current Tenant" value={tenant?.name} loading={isTenantLoading} />
        <InfoRow label="Tenant Creation Date" value={tenant?.createdAt?.toDate().toLocaleDateString()} loading={isTenantLoading} />
      </CardContent>
      <CardFooter className="flex-col sm:flex-row gap-2 items-start sm:items-center">
        <Button variant="outline" onClick={handleExport}>Export My Data</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete My Account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                account and remove all your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Yes, delete my account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
