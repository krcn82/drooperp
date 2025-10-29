'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface OrderItem {
  name: { de: string; en: string };
  price: number;
  qty: number;
}

interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  status: 'pending' | 'cooking' | 'ready' | 'served';
  createdAt: Timestamp;
}

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


export default function CustomerDisplayPage() {
  const firestore = useFirestore();
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    const storedTenantId = localStorage.getItem('tenantId');
    setTenantId(storedTenantId);
  }, []);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return query(
      collectionGroup(firestore, 'orders'),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, tenantId]);

  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

  const latestOrder = useMemo(() => {
    if (!orders || orders.length === 0) return null;
    // The query is already sorted by descending creation time
    return orders[0];
  }, [orders]);
  
  const language = 'de'; // Or detect from tenant settings

  const orderTotal = useMemo(() => {
    if (!latestOrder) return 0;
    return latestOrder.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }, [latestOrder]);

  const getStatusInfo = (status: Order['status']) => {
    switch (status) {
        case 'pending': return { text: "Bestellung empfangen...", className: 'text-yellow-600'};
        case 'cooking': return { text: "Wird zubereitet...", className: 'text-orange-600'};
        case 'ready': return { text: "Bereit zum Servieren!", className: 'text-green-600'};
        case 'served': return { text: "Serviert ✅", className: 'text-muted-foreground'};
        default: return { text: "Warte auf Bestellung...", className: 'text-muted-foreground'};
    }
  }
  
  const statusInfo = getStatusInfo(latestOrder?.status || 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-muted">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!latestOrder) {
    return (
      <div className="flex items-center justify-center h-screen bg-muted">
        <p className="text-muted-foreground text-xl font-semibold">
          👋 Willkommen! Bestellung wird angezeigt, sobald aktiv.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-muted/50 to-background">
      <Card className="w-[480px] shadow-xl bg-card">
        <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              Tisch {latestOrder.tableId}
            </CardTitle>
            <CardDescription className={cn("text-sm font-medium", statusInfo.className)}>
              {statusInfo.text}
            </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          
          <Separator />

          <div className="space-y-2">
            {latestOrder.items.map((item, i) => (
              <div
                key={i}
                className="flex justify-between text-card-foreground border-b pb-1"
              >
                <span>{item.qty}x {item.name[language]}</span>
                <span>€ {(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex justify-between font-semibold text-lg">
            <span>Gesamt</span>
            <span>€ {orderTotal.toFixed(2)}</span>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Scannen Sie den QR-Code für digitale Rechnung / Bonuspunkte:
            </p>
            <QRCodeSVG
              value={`https://droop.erp/receipt/${latestOrder.id}`}
              size={140}
              bgColor="var(--card)"
              fgColor="var(--card-foreground)"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-xs text-muted-foreground mt-2">
        Last updated: <TimeSince timestamp={latestOrder.createdAt} />
      </div>
    </div>
  );
}
