'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Download, Loader2 } from 'lucide-react';
import { useFirebaseApp, useUser } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function DatevExportPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();

  const functions = useMemo(() => {
    if (!firebaseApp) return null;
    return getFunctions(firebaseApp);
  }, [firebaseApp]);

  const handleExport = async () => {
    if (!user || !functions) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to perform this action.',
      });
      return;
    }

    const tenantId = localStorage.getItem('tenantId');
    if (!tenantId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Tenant ID not found. Please log in again.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const generateDatevExport = httpsCallable(functions, 'generateDatevExport');
      const result: any = await generateDatevExport({ tenantId });

      if (result.data.csv) {
        // Create a blob from the CSV content
        const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
        
        // Create a link element to trigger the download
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const formattedDate = format(new Date(), 'yyyy-MM-dd');
        link.setAttribute('download', `datev-export-${tenantId}-${formattedDate}.csv`);
        
        // Append to the document, click, and then remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: 'Success',
          description: 'DATEV export has been downloaded.',
        });
      } else {
        toast({
          title: 'No Data',
          description: 'No transactions found to export.',
        });
      }

    } catch (error: any) {
      console.error('DATEV Export Error:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline tracking-tight">DATEV CSV Export</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Generate Financial Data Export</CardTitle>
          <CardDescription>
            Export your financial transactions in a DATEV-compatible CSV format. This process may take a few moments
            depending on the amount of data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Click the button below to generate the export. The file will be created by our backend
            and a download will start automatically.
          </p>
          {/* Date range picker could be added here in the future */}
        </CardContent>
        <CardFooter>
          <Button className="bg-accent hover:bg-accent/90" onClick={handleExport} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Generating...' : 'Generate & Download DATEV Export'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
