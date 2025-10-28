
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TableStatus = 'free' | 'occupied' | 'reserved';

const mockTables: { id: string, name: string, status: TableStatus, seats: number }[] = [
  { id: 't1', name: 'Table 1', status: 'occupied', seats: 4 },
  { id: 't2', name: 'Table 2', status: 'free', seats: 2 },
  { id: 't3', name: 'Table 3', status: 'reserved', seats: 6 },
  { id: 't4', name: 'Table 4', status: 'free', seats: 4 },
  { id: 't5', name: 'Table 5', status: 'occupied', seats: 8 },
  { id: 't6', name: 'Bar 1', status: 'free', seats: 1 },
  { id: 't7', name: 'Bar 2', status: 'occupied', seats: 1 },
];

const statusStyles: Record<TableStatus, string> = {
    free: 'border-green-500 bg-green-50',
    occupied: 'border-red-500 bg-red-50',
    reserved: 'border-blue-500 bg-blue-50',
}

export default function TableMap() {
  return (
    <div>
      <h3 className="text-2xl font-bold mb-4">Table Map</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {mockTables.map(table => (
          <Card key={table.id} className={cn("cursor-pointer hover:shadow-lg transition-shadow border-2", statusStyles[table.status])}>
            <CardHeader className="flex-row justify-between items-center pb-2">
              <CardTitle className="text-lg">{table.name}</CardTitle>
              <Badge variant={table.status === 'occupied' ? 'destructive' : table.status === 'reserved' ? 'default' : 'secondary'} className="capitalize">
                {table.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{table.seats} Seats</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
