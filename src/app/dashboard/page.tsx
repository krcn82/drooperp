'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, CreditCard, Calendar, ShoppingCart } from "lucide-react";
import { useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, collection, Timestamp } from "firebase/firestore";
import { useDoc, useCollection } from "@/firebase";
import Link from "next/link";
import { useEffect, useState } from "react";

type Tenant = {
  name: string;
  plan: string;
  createdAt: Timestamp;
};

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const storedTenantId = localStorage.getItem('tenantId');
      setTenantId(storedTenantId);
    }
  }, [user]);

  const tenantRef = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return doc(firestore, 'tenants', tenantId);
  }, [firestore, tenantId]);
  
  const usersRef = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return collection(firestore, `tenants/${tenantId}/users`);
  }, [firestore, tenantId]);
  
  const ordersRef = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return collection(firestore, `tenants/${tenantId}/orders`);
  }, [firestore, tenantId]);

  const { data: tenant, isLoading: isTenantLoading } = useDoc<Tenant>(tenantRef);
  const { data: users, isLoading: areUsersLoading } = useCollection(usersRef);
  const { data: orders, isLoading: areOrdersLoading } = useCollection(ordersRef);

  const tenantName = tenant?.name || "Droop Inc.";
  const totalSales = orders?.length || 0;
  const activeUsers = users?.length || 0;
  const subscriptionPlan = tenant?.plan || "Free";
  const creationDate = tenant?.createdAt?.toDate()?.toLocaleDateString() || new Date().toLocaleDateString();
  const hasActivity = totalSales > 0 || activeUsers > 1;

  const isLoading = isTenantLoading || areUsersLoading || areOrdersLoading;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Welcome, {isLoading ? '...' : tenantName}
        </h1>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Total orders recorded
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
             <p className="text-xs text-muted-foreground">
              Users in this tenant
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription Plan</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{subscriptionPlan}</div>
            <p className="text-xs text-muted-foreground">
              Your current plan
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Date of Creation</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creationDate}</div>
            <p className="text-xs text-muted-foreground">
              Your journey started here
            </p>
          </CardContent>
        </Card>
      </div>

      {!isLoading && !hasActivity && (
         <Card className="text-center">
            <CardHeader>
                <CardTitle>No Activity Yet</CardTitle>
                <CardDescription>Get started by making your first sale.</CardDescription>
            </CardHeader>
            <CardContent>
                <Link href="/dashboard/pos">
                    <Button>
                        <ShoppingCart className="mr-2"/>
                        Go to Point of Sale
                    </Button>
                </Link>
            </CardContent>
         </Card>
      )}
    </>
  );
}
