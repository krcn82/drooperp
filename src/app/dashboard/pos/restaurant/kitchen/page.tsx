
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collectionGroup, query, where, doc, getDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CookingPot, Check, Utensils, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';


type KdsOrder = {
  id: string;
  tableId: string;
  items: { name: { de: string; en: string; }; qty: number }[];
  createdAt: Timestamp;
  status: 'pending' | 'cooking' | 'ready' | 'served';
};

function TimeSince({ timestamp }: { timestamp: Timestamp }) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const update = () => {
        if (timestamp) {
            setTimeAgo(formatDistanceToNow(timestamp.toDate(), { addSuffix: true }));
        }
    };
    update();
    const interval = setInterval(update, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [timestamp]);

  return <span className="font-mono">{timeAgo}</span>;
}

export default function KdsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string>('Kitchen Display');
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const { toast } = useToast();
  
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
        collectionGroup(firestore, `orders`),
        where('status', '!=', 'served')
        // In a multi-tenant app, you'd add a where clause for the tenantId on each order doc.
        // For this example, collectionGroup will get orders from all tenants.
        // A security rule would be required to enforce tenant isolation.
    );
  }, [firestore, tenantId]);

  const { data: orders, isLoading, error } = useCollection<KdsOrder>(kdsOrdersQuery);

  const updateStatus = async (orderId: string, tableId: string, status: KdsOrder['status']) => {
    if (!tenantId || !firestore) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Cannot update status. Services not available.',
        });
        return;
    }
    
    setIsSubmitting(orderId);
    try {
        const orderRef = doc(firestore, `tenants/${tenantId}/tables/${tableId}/orders/${orderId}`);
        await updateDocumentNonBlocking(orderRef, { status: status });
        
        toast({
            title: 'Status Updated',
            description: `Order has been marked as ${status}.`,
        });
    } catch (e: any) {
        console.error('Error updating order status:', e);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: e.message || 'Could not update order status.',
        });
    } finally {
        setIsSubmitting(null);
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
  
  const sortedOrders = useMemo(() => {
    if (!orders) return [];
    // The collectionGroup query doesn't know about the parent doc, so tableId won't be on the order object.
    // In a real app, you'd store tableId on the order doc itself. We'll simulate for now.
    return [...orders].sort((a,b) => a.createdAt.seconds - b.createdAt.seconds).map(o => ({...o, tableId: o.tableId || 'T?'}));
  }, [orders]);

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

      {!isLoading && !error && sortedOrders && sortedOrders.length === 0 && (
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
          {sortedOrders.map(order => (
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
                      <span className="font-medium">{item.name.de}</span>
                      <span className="font-bold text-primary">x {item.qty}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 pt-4">
                 {isSubmitting === order.id ? <Button className="w-full" disabled><Loader2 className="animate-spin" /></Button> : (
                    <>
                        {order.status === 'pending' && (
                        <Button onClick={() => updateStatus(order.id, order.tableId, 'cooking')} className="w-full" variant="secondary">
                            <CookingPot className="mr-2"/>
                            Start Cooking
                        </Button>
                        )}
                        {order.status === 'cooking' && (
                        <Button onClick={() => updateStatus(order.id, order.tableId, 'ready')} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                            <Check className="mr-2" />
                            Mark as Ready
                        </Button>
                        )}
                        {order.status === 'ready' && (
                        <Button onClick={() => updateStatus(order.id, order.tableId, 'served')} className="w-full">
                            <Utensils className="mr-2"/>
                            Mark as Served
                        </Button>
                        )}
                    </>
                 )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
