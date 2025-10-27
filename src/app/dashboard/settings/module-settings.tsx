'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, ShoppingCart, CookingPot, Calendar, Contact, Bot, Utensils } from 'lucide-react';
import { Tenant } from './tenant-settings';
import { updateModuleSettings } from './tenant-actions';
import { planLimits, PlanId } from '@/lib/plans';
import { Skeleton } from '@/components/ui/skeleton';

type ModuleId = 'posShop' | 'posRestaurant' | 'calendar' | 'kiosk' | 'aiAssistant';

type ModuleSettingsData = {
  posShop: boolean;
  posRestaurant: boolean;
  calendar: boolean;
  kiosk: boolean;
  aiAssistant: boolean;
};

const moduleDefinitions: { id: ModuleId; name: string; description: string, icon: React.ElementType }[] = [
    { id: 'posShop', name: 'Point of Sale (Shop)', description: 'Standard retail checkout system.', icon: ShoppingCart },
    { id: 'posRestaurant', name: 'Point of Sale (Restaurant)', description: 'Includes table management and KDS integration.', icon: Utensils },
    { id: 'calendar', name: 'Calendar', description: 'Team and appointment scheduling.', icon: Calendar },
    { id: 'kiosk', name: 'Kiosk Mode', description: 'Customer-facing self-service terminal.', icon: Contact },
    { id: 'aiAssistant', name: 'AI Assistant', description: 'Enable the intelligent AI chat assistant.', icon: Bot },
];

export default function ModuleSettings({ tenant }: { tenant: Tenant }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<Partial<ModuleSettingsData>>({});

  const moduleSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, `tenants/${tenant.id}/settings/modules`);
  }, [firestore, tenant.id]);

  const { data: initialSettings, isLoading, error } = useDoc<ModuleSettingsData>(moduleSettingsRef);

  useEffect(() => {
    if (initialSettings) {
      setCurrentSettings(initialSettings);
    }
  }, [initialSettings]);

  const handleToggle = (moduleId: ModuleId) => {
    setCurrentSettings(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const result = await updateModuleSettings(tenant.id, currentSettings);
    if (result.success) {
      toast({
        title: 'Settings Saved',
        description: `Module settings for ${tenant.name} have been updated.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: result.message,
      });
    }
    setIsSubmitting(false);
  };
  
  const currentPlan = planLimits[tenant.plan] || planLimits.free;
  const enabledModuleCount = useMemo(() => {
    return Object.values(currentSettings).filter(Boolean).length;
  }, [currentSettings]);
  const canEnableMore = enabledModuleCount < currentPlan.limits.modules;

  if (error) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2"><AlertCircle /> Error</CardTitle>
                <CardDescription>Could not load module settings for {tenant.name}.</CardDescription>
            </CardHeader>
            <CardContent><p className="text-sm text-muted-foreground font-mono">{error.message}</p></CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Module Configuration for "{tenant.name}"</CardTitle>
        <CardDescription>
            Enable or disable modules for this tenant. Your current plan (<span className="font-semibold capitalize">{tenant.plan}</span>) allows for <span className="font-semibold">{currentPlan.limits.modules}</span> active modules.
            You have <span className="font-semibold">{enabledModuleCount}</span> enabled.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({length: 5}).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-4 w-[100px]" />
                    </div>
                </div>
            ))
          ) : (
             moduleDefinitions.map((mod) => {
              const isEnabled = currentSettings[mod.id] || false;
              const isDisabled = !isEnabled && !canEnableMore;
              return (
                <div key={mod.id} className="flex items-start gap-4 p-4 rounded-lg border bg-muted/20">
                    <mod.icon className="h-6 w-6 mt-1 text-primary"/>
                    <div className="flex-1">
                        <Label htmlFor={mod.id} className="text-base font-medium">{mod.name}</Label>
                        <p className="text-sm text-muted-foreground">{mod.description}</p>
                    </div>
                    <Switch
                        id={mod.id}
                        checked={isEnabled}
                        onCheckedChange={() => handleToggle(mod.id)}
                        disabled={isDisabled}
                    />
                </div>
              );
            })
          )}
        </div>
        {!canEnableMore && <p className="text-sm text-destructive mt-4">You have reached the maximum number of modules for your plan.</p>}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={isSubmitting || isLoading}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Module Settings
        </Button>
      </CardFooter>
    </Card>
  );
}
