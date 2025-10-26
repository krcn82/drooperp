'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, CreditCard, Calendar, ShoppingCart } from "lucide-react";
import { useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, collection } from "firebase/firestore";
import { useDoc, useCollection } from "@/firebase";
import Link from "next/link";


export default function DashboardPage() {
  // For now, we will use static data. We will connect to Firestore in a follow-up.
  const tenantName = "Droop Inc.";
  const totalSales = 0;
  const activeUsers = 0;
  const subscriptionPlan = "Free";
  const creationDate = "2024-01-01";
  const hasActivity = totalSales > 0 || activeUsers > 0;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Welcome, {tenantName}
        </h1>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Total transactions recorded
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
            <div className="text-2xl font-bold">{new Date(creationDate).toLocaleDateString()}</div>
            <p className="text-xs text-muted-foreground">
              Your journey started here
            </p>
          </CardContent>
        </Card>
      </div>

      {!hasActivity && (
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
