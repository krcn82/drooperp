'use client';

import React from 'react';
import { useActionState } from 'react';
import { updateSettings } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const initialState = {
  message: null,
  error: false,
};

export default function SettingsPage() {
  const [state, formAction, isPending] = useActionState(updateSettings, initialState);
  const { toast } = useToast();

  React.useEffect(() => {
    if (state?.message) {
      toast({
        title: state.error ? 'Error' : 'Success',
        description: state.message,
        variant: state.error ? 'destructive' : 'default',
      });
    }
  }, [state, toast]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline tracking-tight">Tenant Settings</h1>
      <Card className="max-w-2xl">
        <form action={formAction}>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Manage your organization's details and branding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input id="company-name" name="companyName" placeholder="Your Company LLC" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme-color">Theme Color</Label>
              <Select name="themeColor">
                <SelectTrigger id="theme-color">
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </CardFooter>
        </form>
      </Card>

      {state?.message && !isPending && (
        <div className={`mt-4 text-sm font-medium ${state.error ? 'text-destructive' : 'text-primary'}`}>
            {state.message}
        </div>
      )}
    </div>
  );
}
