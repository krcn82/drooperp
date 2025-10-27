'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, ShoppingCart, BarChart, Package, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useFirebaseApp, useUser } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ReportData = {
  totalRevenue: number;
  totalTransactions: number;
  avgTicketSize: number;
  chartData: { date: string; revenue: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
};

type Range = 'today' | 'last7days' | 'last30days';

export default function ReportsPage() {
  const { user } = useUser();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>('last7days');

  const functions = useMemo(() => {
    if (!firebaseApp) return null;
    return getFunctions(firebaseApp);
  }, [firebaseApp]);

  useEffect(() => {
    const storedTenantId = localStorage.getItem('tenantId');
    setTenantId(storedTenantId);
  }, []);
  
  useEffect(() => {
    if (!tenantId || !functions || !user) {
      return;
    }

    const fetchReport = async () => {
      setIsLoading(true);
      setError(null);
      setReport(null);
      
      try {
        const generateReport = httpsCallable< { tenantId: string; range: Range }, ReportData>(functions, 'generateReport');
        const result = await generateReport({ tenantId, range });
        setReport(result.data);
      } catch (e: any) {
        console.error('Error generating report:', e);
        setError(e.message || 'An unexpected error occurred.');
        toast({
          variant: 'destructive',
          title: 'Report Generation Failed',
          description: e.message,
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReport();

  }, [tenantId, functions, user, range, toast]);

  const mostSoldProduct = report?.topProducts && report.topProducts.length > 0 ? report.topProducts[0].name : 'N/A';
  
  const formattedChartData = useMemo(() => {
    return report?.chartData.map(item => ({
        ...item,
        date: format(new Date(item.date), 'MMM d'),
    }))
  }, [report?.chartData])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Reports & Analytics</h1>
        <div className="flex items-center gap-2">
            {(['today', 'last7days', 'last30days'] as Range[]).map(r => (
                <Button 
                    key={r}
                    variant={range === r ? 'default' : 'outline'}
                    onClick={() => setRange(r)}
                    className={cn("capitalize")}
                >
                    {r.replace('last', 'Last ')}
                </Button>
            ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2">Generating your report...</p>
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Report</CardTitle>
            <CardDescription>There was a problem generating your report.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {report && !isLoading && !error && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(report.totalRevenue || 0).toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.totalTransactions || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Ticket Size</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(report.avgTicketSize || 0).toFixed(2)}</div>
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
              <CardTitle>Daily Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formattedChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" activeDot={{ r: 8 }} />
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
                  {report.topProducts.map((product, index) => (
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
        </>
      )}
    </div>
  );
}
