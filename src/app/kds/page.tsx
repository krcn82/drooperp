'use client';

import React, { useEffect, useState } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CookingPot, Check, Utensils, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { FirebaseApp } from 'firebase/app';
import { useFirebaseApp } from '@/firebase';

type KdsOrder = {
  id: string;
  tableId: string;
  items: { name: string; qty: number }[];
  createdAt: { seconds: number; nanoseconds: number };
  status: 'pending' | 'cooking' | 'ready' | 'served';
};

function TimeSince({ timestamp }: { timestamp: { seconds: number; nanoseconds: number } }) {
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    const updateMinutes = () => {
      if (timestamp) {
        const now = new Date();
        const orderTime = new Date(timestamp.seconds * 1000);
        const diff = Math.floor((now.getTime() - orderTime.getTime()) / 60000);
        setMinutes(diff);
      }
    };

    updateMinutes();
    const interval = setInterval(updateMinutes, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [timestamp]);

  return <span className="font-mono">{minutes} min ago</span>;
}

export default function KdsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string>('Kitchen Display');
  const { toast } = useToast();
  
  // Memoize functions instance
  const functions = useMemo(() => {
    if (!firebaseApp) return null;
    return getFunctions(firebaseApp);
  }, [firebaseApp]);

  useEffect(() => {
    const storedTenantId = localStorage.getItem('tenantId');
    setTenantId(storedTenantId);
    if (storedTenantId && firestore) {
      const tenantRef = doc(firestore, `tenants/${storedTenantId}`);
      getDoc(tenantRef).then(docSnap => {
        if (docSnap.exists()) {
          setTenantName(docSnap.data().name);
        }
      });
    }
  }, [firestore]);
  
  const kdsOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return query(
        collection(firestore, `tenants/${tenantId}/kdsOrders`),
        where('status', '!=', 'served')
    );
  }, [firestore, tenantId]);

  const { data: orders, isLoading, error } = useCollection<KdsOrder>(kdsOrdersQuery);

  const updateStatus = async (orderId: string, status: KdsOrder['status']) => {
    if (!tenantId || !functions) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Cannot update status. Services not available.',
        });
        return;
    }
    
    try {
        const updateKdsOrderStatus = httpsCallable(functions, 'updateKdsOrderStatus');
        await updateKdsOrderStatus({ tenantId, orderId, status });
        
        toast({
            title: 'Status Updated',
            description: `Order has been marked as ${status}.`,
        });
    } catch (e: any) {
        console.error('Error calling updateKdsOrderStatus:', e);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: e.message || 'Could not update order status.',
        });
    }
  };

  const getStatusColor = (status: KdsOrder['status']) => {
    switch (status) {
      case 'pending':
        return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'cooking':
        return 'border-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'ready':
        return 'border-green-400 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-muted/20">
      <header className="bg-card shadow-sm p-4 z-10 border-b">
        <h1 className="text-2xl font-bold font-headline tracking-tight">
          Kitchen Display – {tenantName}
        </h1>
      </header>

      {isLoading && (
         <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <CookingPot className="w-8 h-8 animate-bounce" />
            <p className="ml-2">Loading Orders...</p>
         </div>
      )}
      
      {error && (
        <div className="flex flex-1 items-center justify-center text-red-500">
           <AlertCircle className="w-8 h-8" />
           <p className="ml-2">Error loading orders. Please check permissions.</p>
        </div>
      )}

      {!isLoading && !error && orders && orders.length === 0 && (
         <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Check className="mx-auto h-12 w-12" />
              <h2 className="mt-2 text-xl font-semibold">All Caught Up!</h2>
              <p>No pending orders right now.</p>
            </div>
         </div>
      )}

      <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {orders && orders.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds).map(order => (
            <Card key={order.id} className={cn('flex flex-col border-2 transition-all', getStatusColor(order.status))}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold">Table {order.tableId}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  <TimeSince timestamp={order.createdAt} />
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <ul className="divide-y">
                  {order.items.map((item, index) => (
                    <li key={index} className="py-1 flex justify-between">
                      <span className="font-medium">{item.name}</span>
                      <span className="font-bold text-primary">x {item.qty}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 pt-4">
                {order.status === 'pending' && (
                  <Button onClick={() => updateStatus(order.id, 'cooking')} className="w-full" variant="secondary">
                    <CookingPot className="mr-2"/>
                    Start Cooking
                  </Button>
                )}
                {order.status === 'cooking' && (
                  <Button onClick={() => updateStatus(order.id, 'ready')} className="w-full" style={{backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))"}}>
                    <Check className="mr-2" />
                    Mark as Ready
                  </Button>
                )}
                {order.status === 'ready' && (
                  <Button onClick={() => updateStatus(order.id, 'served')} className="w-full">
                    <Utensils className="mr-2"/>
                    Mark as Served
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
