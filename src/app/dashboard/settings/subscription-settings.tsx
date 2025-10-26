'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type Tenant = {
  id: string;
  name: string;
  plan: 'free' | 'standard' | 'custom';
};

const plans = [
  {
    name: 'Free',
    id: 'free' as const,
    price: '$0',
    description: 'For individuals and small teams just getting started.',
    features: ['50 Transactions/Month', 'Basic Reporting', '1 User'],
  },
  {
    name: 'Standard',
    id: 'standard' as const,
    price: '€31',
    description: 'For growing businesses that need more power and support.',
    features: ['500 Transactions/Month', 'Advanced Reporting', '5 Users', 'DATEV Export'],
    popular: true,
  },
  {
    name: 'Custom',
    id: 'custom' as const,
    price: '€47',
    description: 'For large enterprises with custom needs.',
    features: ['Unlimited Transactions', 'Custom Integrations', 'Dedicated Support', 'API Access'],
  },
];

export default function SubscriptionSettings() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    const storedTenantId = localStorage.getItem('tenantId');
    setTenantId(storedTenantId);
  }, []);

  const tenantRef = useMemoFirebase(() => {
    if (!firestore || !tenantId) return null;
    return doc(firestore, 'tenants', tenantId);
  }, [firestore, tenantId]);

  const { data: tenant, isLoading: isTenantLoading } = useDoc<Tenant>(tenantRef);
  const currentPlanId = tenant?.plan || 'free';

  const handlePlanChange = (newPlanId: 'free' | 'standard' | 'custom') => {
    if (!tenantRef) return;
    setIsUpdating(newPlanId);

    // This is a non-blocking write. The UI will update optimistically via the useDoc listener.
    // The setDocumentNonBlocking function handles permission errors globally.
    setDocumentNonBlocking(tenantRef, { plan: newPlanId }, { merge: true });

    // We can show a toast optimistically as well.
    toast({
      title: 'Subscription Updated',
      description: `Your plan has been changed to ${newPlanId}.`,
    });
    
    // Simulate network latency for visual feedback
    setTimeout(() => setIsUpdating(null), 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Manage your billing information and subscription plan.</CardDescription>
      </CardHeader>
      <CardContent>
        {isTenantLoading ? (
            <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
            </div>
        ) : (
            <p className="text-sm">You are currently on the <span className="font-semibold capitalize">{tenant?.plan || 'Free'}</span> plan.</p>
        )}
      </CardContent>
      <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlanId;
            return (
                <Card key={plan.id} className={cn('flex flex-col', isCurrentPlan && 'border-primary ring-2 ring-primary')}>
                    <CardHeader>
                        <CardTitle>{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                        <div className="text-4xl font-bold">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {plan.features.map(feature => (
                                <li key={feature} className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-primary" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            className="w-full" 
                            variant={isCurrentPlan ? 'outline' : 'default'}
                            disabled={isCurrentPlan || !!isUpdating}
                            onClick={() => handlePlanChange(plan.id)}
                        >
                            {isUpdating === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isCurrentPlan ? 'Current Plan' : (plan.id > currentPlanId ? 'Upgrade' : 'Downgrade')}
                        </Button>
                    </CardFooter>
                </Card>
            )
        })}
      </CardContent>
    </Card>
  );
}
