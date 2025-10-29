'use client';

import { useState, useMemo, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirebaseApp } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Gift, Search } from 'lucide-react';
import LoyaltyBadge from '../pos/components/LoyaltyBadge';

interface LoyaltyInfo {
    fullName: string;
    loyaltyPoints: number;
    vipTier: 'none' | 'silver' | 'gold' | 'platinum';
    lastVisit: { _seconds: number; _nanoseconds: number } | null;
}

export default function LoyaltyCheckerPage() {
    const { user } = useUser();
    const firebaseApp = useFirebaseApp();
    const { toast } = useToast();
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [customerId, setCustomerId] = useState('');
    const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const storedTenantId = localStorage.getItem('tenantId');
        setTenantId(storedTenantId);
    }, []);

    const functions = useMemo(() => {
        if (!firebaseApp) return null;
        return getFunctions(firebaseApp);
    }, [firebaseApp]);

    const checkPoints = async () => {
        if (!functions || !tenantId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Services not ready.' });
            return;
        }
        if (!customerId.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Customer ID cannot be empty.' });
            return;
        }

        setIsLoading(true);
        setLoyaltyInfo(null);
        const getCustomerLoyalty = httpsCallable< { tenantId: string; customerId: string }, LoyaltyInfo>(functions, 'getCustomerLoyalty');
        
        try {
            const result = await getCustomerLoyalty({ tenantId, customerId });
            setLoyaltyInfo(result.data);
            toast({ title: 'Success', description: `Loyalty data loaded for ${result.data.fullName}.` });
        } catch (err: any) {
            toast.error("Error checking points: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold font-headline tracking-tight">Customer Loyalty</h1>
            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Gift /> Check Bonus Points</CardTitle>
                    <CardDescription>Enter a Customer ID to check their current loyalty status.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="customer-id">Customer ID</Label>
                        <Input
                            id="customer-id"
                            type="text"
                            placeholder="Enter Customer ID or scan QR code"
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                     <Button onClick={checkPoints} disabled={isLoading || !customerId}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Check Points
                    </Button>
                </CardFooter>
            </Card>

            {loyaltyInfo && (
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>{loyaltyInfo.fullName}</CardTitle>
                        <CardDescription>
                            Last visit: {loyaltyInfo.lastVisit ? new Date(loyaltyInfo.lastVisit._seconds * 1000).toLocaleDateString("de-DE") : 'N/A'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-6xl font-bold text-primary">{loyaltyInfo.loyaltyPoints}</p>
                        <p className="text-muted-foreground">Points</p>
                        <div className="mt-4 flex justify-center">
                          <LoyaltyBadge vipTier={loyaltyInfo.vipTier} loyaltyPoints={loyaltyInfo.loyaltyPoints}/>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
