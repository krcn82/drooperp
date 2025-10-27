'use client';

import React, {useEffect, useState, useMemo} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {DollarSign, ShoppingCart, BarChart, Package} from 'lucide-react';
import {useCollection, useFirestore} from '@/firebase';
import {collection, Timestamp} from 'firebase/firestore';
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer} from 'recharts';
import {format} from 'date-fns';
import { useMemoFirebase } from '@/firebase/provider';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type TransactionItem = {
  name: string;
  qty: number;
  price: number;
  productId: string;
};

type Transaction = {
  id: string;
  items: TransactionItem[];
  amountTotal: number; // Changed from totalAmount to match POS data
  timestamp: Timestamp;
};

type ProcessedData = {
  totalRevenue: number;
  totalTransactions: number;
  avgTicketSize: number;
  mostSoldProduct: string;
  chartData: {date: string; revenue: number}[];
  topProducts: {name: string; quantity: number; revenue: number}[];
};

const processTransactions = (transactions: Transaction[] | null): ProcessedData => {
  if (!transactions || transactions.length === 0) {
    return {
      totalRevenue: 0,
      totalTransactions: 0,
      avgTicketSize: 0,
      mostSoldProduct: 'N/A',
      chartData: [],
      topProducts: [],
    };
  }

  const totalRevenue = transactions.reduce((sum, tx) => sum + tx.amountTotal, 0);
  const totalTransactions = transactions.length;
  const avgTicketSize = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Chart data (last 14 days)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const dailyRevenue: {[key: string]: number} = {};
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dailyRevenue[format(date, 'yyyy-MM-dd')] = 0;
  }

  transactions.forEach(tx => {
    if (tx.timestamp && tx.timestamp.toDate() >= fourteenDaysAgo) {
      const dateStr = format(tx.timestamp.toDate(), 'yyyy-MM-dd');
      dailyRevenue[dateStr] = (dailyRevenue[dateStr] || 0) + tx.amountTotal;
    }
  });

  const chartData = Object.keys(dailyRevenue)
    .map(date => ({
      date: format(new Date(date), 'MMM d'),
      revenue: dailyRevenue[date],
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Product analysis
  const productSales = new Map<string, {name: string; quantity: number; revenue: number}>();
  transactions.forEach(tx => {
    // The items in the transaction might not be in the format we expect.
    // Let's check for productIds and quantities, or items array.
    if (Array.isArray(tx.items)) {
         tx.items.forEach(item => {
            const existing = productSales.get(item.productId);
            if (existing) {
                existing.quantity += item.qty;
                existing.revenue += item.price * item.qty;
            } else {
                productSales.set(item.productId, {
                name: item.name,
                quantity: item.qty,
                revenue: item.price * item.qty,
                });
            }
         });
    }
  });

  const topProducts = Array.from(productSales.values()).sort((a, b) => b.quantity - a.quantity);
  const mostSoldProduct = topProducts.length > 0 ? topProducts[0].name : 'N/A';

  return {
    totalRevenue,
    totalTransactions,
    avgTicketSize,
    mostSoldProduct,
    chartData,
    topProducts,
  };
};

export default function ReportsPage() {
  const firestore = useFirestore();
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    const storedTenantId = localStorage.getItem('tenantId');
    setTenantId(storedTenantId);
  }, []);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return collection(firestore, `tenants/${tenantId}/transactions`);
  }, [firestore, tenantId]);

  const {data: transactions, isLoading, error} = useCollection<Transaction>(transactionsQuery);
  const processedData = useMemo(() => processTransactions(transactions), [transactions]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Reports & Analytics</h1>
        <p>Loading report data...</p>
      </div>
    );
  }
  
  if (!transactions || transactions.length === 0) {
      return (
          <div className="flex flex-col gap-6">
              <h1 className="text-3xl font-bold font-headline tracking-tight">Reports & Analytics</h1>
              <Card>
                  <CardHeader>
                      <CardTitle>No Transactions Found</CardTitle>
                      <CardDescription>
                          Start using your POS to generate reports.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                      <p>Once you start making sales, your reports and analytics will appear here.</p>
                       <Link href="/dashboard/pos" className="mt-4 inline-block">
                          <Button>
                              <ShoppingCart className="mr-2 h-4 w-4" /> Go to Point of Sale
                          </Button>
                        </Link>
                  </CardContent>
              </Card>
          </div>
      )
  }
  
  if (error) {
     return (
          <div className="flex flex-col gap-6">
              <h1 className="text-3xl font-bold font-headline tracking-tight">Reports & Analytics</h1>
              <Card className="border-destructive">
                  <CardHeader>
                      <CardTitle className="text-destructive">Error Loading Data</CardTitle>
                      <CardDescription>
                         There was an error fetching your transaction data. Please check your permissions.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                      <p className="font-mono text-sm text-muted-foreground">{error.message}</p>
                  </CardContent>
              </Card>
          </div>
      )
  }


  const {totalRevenue, totalTransactions, avgTicketSize, mostSoldProduct, chartData, topProducts} = processedData;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline tracking-tight">Reports & Analytics</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Ticket Size</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgTicketSize.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Sold Product</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostSoldProduct}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue (Last 14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `$${value}`} />
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" activeDot={{r: 8}} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
          <CardDescription>Products ranked by quantity sold.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead className="text-right">Quantity Sold</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.slice(0, 10).map((product, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-right">{product.quantity}</TableCell>
                  <TableCell className="text-right">${product.revenue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    