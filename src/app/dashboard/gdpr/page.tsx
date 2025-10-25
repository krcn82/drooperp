'use client';

import React from 'react';
import {useActionState} from 'react';
import {discoverData} from './actions';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Loader2, AlertCircle, CheckCircle, FileDown, Trash2} from 'lucide-react';
import {Separator} from '@/components/ui/separator';
import {Badge} from '@/components/ui/badge';

type GDPRDataDiscoveryOutput = {
  collections: {
    collectionName: string;
    documentIds: string[];
  }[];
};

const initialState = {
  message: null,
  data: null,
  error: false,
};

function ResultsDisplay({data}: {data: GDPRDataDiscoveryOutput}) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold font-headline">Discovered Data Collections</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {data.collections.map(collection => (
          <Card key={collection.collectionName}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{collection.collectionName}</span>
                <Badge variant="secondary">{collection.documentIds.length} documents</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {collection.documentIds.map(docId => (
                  <li key={docId} className="font-mono">
                    {docId}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="gap-2">
              <Button variant="outline" size="sm">
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function GdprPage() {
  const [state, formAction, isPending] = useActionState(discoverData, initialState);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline tracking-tight">GDPR Compliance Tools</h1>
      <Card>
        <CardHeader>
          <CardTitle>User Data Discovery</CardTitle>
          <CardDescription>
            Use our AI-powered tool to find all data related to a specific User ID across your Firestore collections.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent>
            <div className="grid w-full items-center gap-2">
              <Label htmlFor="userId">User ID</Label>
              <Input type="text" id="userId" name="userId" placeholder="Enter User ID to start discovery" required />
            </div>
            {state?.message && state.error && <p className="text-sm font-medium text-destructive mt-2">{state.message}</p>}
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Discover Data
            </Button>
          </CardFooter>
        </form>
      </Card>

      {isPending && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>AI is discovering data, please wait...</p>
        </div>
      )}

      {state?.message && !isPending && (
        <Alert variant={state.error ? 'destructive' : 'default'}>
          {state.error ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertTitle>{state.error ? 'Error' : 'Success'}</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state?.data && !isPending && (
        <>
          <Separator />
          <ResultsDisplay data={state.data} />
        </>
      )}
    </div>
  );
}
