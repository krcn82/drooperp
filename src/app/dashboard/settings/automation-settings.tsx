'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings2, AlertCircle } from 'lucide-react';
import { updateAutomationRules } from './automation-actions';
import { Skeleton } from '@/components/ui/skeleton';

type AutomationRules = {
  highOrderVolumeThreshold: number;
  lowStockThreshold: number;
  integrationTimeoutMinutes: number;
  dailySummaryEnabled: boolean;
};

const defaultRules: AutomationRules = {
  highOrderVolumeThreshold: 20,
  lowStockThreshold: 5,
  integrationTimeoutMinutes: 30,
  dailySummaryEnabled: true,
};

export default function AutomationSettings() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentRules, setCurrentRules] = useState<AutomationRules>(defaultRules);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const storedTenantId = localStorage.getItem('tenantId');
    setTenantId(storedTenantId);
  }, []);

  const automationRulesRef = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return doc(firestore, `tenants/${tenantId}/settings/automationRules`);
  }, [firestore, tenantId]);

  const { data: initialRules, isLoading, error } = useDoc<AutomationRules>(automationRulesRef);

  useEffect(() => {
    if (initialRules) {
      setCurrentRules({ ...defaultRules, ...initialRules });
    }
  }, [initialRules]);
  
  useEffect(() => {
    setHasChanges(JSON.stringify(initialRules || defaultRules) !== JSON.stringify(currentRules));
  }, [currentRules, initialRules]);

  const handleSliderChange = (ruleId: keyof AutomationRules, value: number[]) => {
    setCurrentRules(prev => ({ ...prev, [ruleId]: value[0] }));
  };

  const handleSwitchChange = (ruleId: keyof AutomationRules, checked: boolean) => {
    setCurrentRules(prev => ({ ...prev, [ruleId]: checked }));
  };

  const handleSubmit = async () => {
    if (!tenantId) return;
    setIsSubmitting(true);
    const result = await updateAutomationRules(tenantId, currentRules);
    if (result.success) {
      toast({ title: 'Settings Saved', description: 'Automation rules have been updated.' });
      setHasChanges(false);
    } else {
      toast({ variant: 'destructive', title: 'Save Failed', description: result.message });
    }
    setIsSubmitting(false);
  };
  
  const handleReset = () => {
    setCurrentRules(initialRules || defaultRules);
  }

  if (isLoading) {
    return (
        <Card>
            <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
            <CardContent className="space-y-8">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
            <CardFooter>
                <Skeleton className="h-10 w-24" />
            </CardFooter>
        </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2"><AlertCircle /> Error</CardTitle>
          <CardDescription>Could not load automation settings.</CardDescription>
        </CardHeader>
        <CardContent><p className="text-sm text-muted-foreground font-mono">{error.message}</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automation Rules</CardTitle>
        <CardDescription>
          Configure the triggers for automated notifications and alerts. These rules run every 15 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <Label>High Order Volume Threshold</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[currentRules.highOrderVolumeThreshold]}
              onValueChange={(value) => handleSliderChange('highOrderVolumeThreshold', value)}
              max={100}
              step={5}
            />
            <span className="font-bold w-12 text-center">{currentRules.highOrderVolumeThreshold}</span>
          </div>
          <p className="text-sm text-muted-foreground">Trigger alert if transaction count in the last 10 minutes exceeds this value.</p>
        </div>

        <div className="space-y-4">
          <Label>Low Stock Threshold</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[currentRules.lowStockThreshold]}
              onValueChange={(value) => handleSliderChange('lowStockThreshold', value)}
              max={50}
              step={1}
            />
            <span className="font-bold w-12 text-center">{currentRules.lowStockThreshold}</span>
          </div>
          <p className="text-sm text-muted-foreground">Trigger alert when a product's stock quantity falls below this number.</p>
        </div>

        <div className="space-y-4">
          <Label>Integration Timeout</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[currentRules.integrationTimeoutMinutes]}
              onValueChange={(value) => handleSliderChange('integrationTimeoutMinutes', value)}
              min={5}
              max={120}
              step={5}
            />
            <span className="font-bold w-20 text-center">{currentRules.integrationTimeoutMinutes} min</span>
          </div>
          <p className="text-sm text-muted-foreground">Trigger alert if an integration has not synced in this many minutes.</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Daily Summary Notification</Label>
            <p className="text-sm text-muted-foreground">Send a notification around midnight that the daily report is ready.</p>
          </div>
          <Switch
            checked={currentRules.dailySummaryEnabled}
            onCheckedChange={(checked) => handleSwitchChange('dailySummaryEnabled', checked)}
          />
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button onClick={handleSubmit} disabled={isSubmitting || !hasChanges}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
        <Button variant="ghost" onClick={handleReset} disabled={!hasChanges}>
          Reset
        </Button>
      </CardFooter>
    </Card>
  );
}

    