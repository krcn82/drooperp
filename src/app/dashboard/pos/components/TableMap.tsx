
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { type Table, type TableStatus } from '../types';
import { Skeleton } from '@/components/ui/skeleton';

interface TableMapProps {
  tenantId: string;
}

const statusStyles: Record<TableStatus, string> = {
  free: 'border-green-500 bg-green-50/50 hover:bg-green-100',
  occupied: 'border-red-500 bg-red-50/50 hover:bg-red-100',
  serving: 'border-blue-500 bg-blue-50/50 hover:bg-blue-100',
};

const statusBadgeVariants: Record<TableStatus, 'secondary' | 'destructive' | 'default'> = {
    free: 'secondary',
    occupied: 'destructive',
    serving: 'default',
};

export default function TableMap({ tenantId }: TableMapProps) {
  const firestore = useFirestore();

  const tablesQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return collection(firestore, `tenants/${tenantId}/tables`);
  }, [firestore, tenantId]);

  const { data: tables, isLoading } = useCollection<Table>(tablesQuery);

  if (isLoading) {
    return (
        <div>
            <h3 className="text-2xl font-bold mb-4">Table Map</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-2xl font-bold mb-4">Table Map</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables?.map(table => (
          <Card key={table.id} className={cn("cursor-pointer hover:shadow-lg transition-shadow border-2", statusStyles[table.status])}>
            <CardHeader className="flex-row justify-between items-center pb-2">
              <CardTitle className="text-lg">{table.name}</CardTitle>
              <Badge variant={statusBadgeVariants[table.status]} className="capitalize">
                {table.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{table.seats} Seats</p>
            </CardContent>
          </Card>
        ))}
         {!isLoading && tables?.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-10">
                No tables have been configured for this tenant.
            </p>
        )}
      </div>
    </div>
  );
}
