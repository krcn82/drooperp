'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Link as LinkIcon, Unplug } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { disconnectIntegration, connectIntegration } from './integration-actions';

type PlatformId = 'wolt' | 'foodora' | 'lieferando';

type Integration = {
    id: PlatformId;
    apiKey: string;
    connectedAt: Timestamp;
    lastSync: Timestamp;
    status: 'active' | 'disconnected' | 'error';
};

const platforms: { id: PlatformId, name: string, logo: string }[] = [
    { id: 'wolt', name: 'Wolt', logo: 'https://wolt.com/favicon.ico' },
    { id: 'foodora', name: 'Foodora', logo: 'https://www.foodora.com/favicon.ico' },
    { id: 'lieferando', name: 'Lieferando', logo: 'https://www.lieferando.de/favicon.ico' },
];

export default function IntegrationsSettings() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [openDialog, setOpenDialog] = useState(false);

    useEffect(() => {
        const storedTenantId = localStorage.getItem('tenantId');
        setTenantId(storedTenantId);
    }, []);

    const integrationsQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return collection(firestore, `tenants/${tenantId}/integrations`);
    }, [firestore, tenantId]);

    const { data: integrations, isLoading, error } = useCollection<Integration>(integrationsQuery);

    const integrationsMap = useMemo(() => {
        const map = new Map<PlatformId, Integration>();
        integrations?.forEach(int => map.set(int.id, int));
        return map;
    }, [integrations]);

    const handleConnect = async () => {
        if (!tenantId || !selectedPlatform || !apiKey) {
            toast({ variant: 'destructive', title: 'Error', description: 'Missing required information.' });
            return;
        }
        setIsSubmitting(true);
        const result = await connectIntegration(tenantId, selectedPlatform, apiKey);
        if (result.success) {
            toast({ title: 'Integration Connected', description: `Successfully connected to ${selectedPlatform}.` });
            setOpenDialog(false);
            setSelectedPlatform(null);
            setApiKey('');
        } else {
            toast({ variant: 'destructive', title: 'Connection Failed', description: result.message });
        }
        setIsSubmitting(false);
    };

    const handleDisconnect = async (platformId: PlatformId) => {
        if (!tenantId) return;
        const result = await disconnectIntegration(tenantId, platformId);
        if (result.success) {
            toast({ title: 'Integration Disconnected', description: `Successfully disconnected from ${platformId}.` });
        } else {
            toast({ variant: 'destructive', title: 'Disconnection Failed', description: result.message });
        }
    };
    
    const openConnectDialog = (platformId: PlatformId) => {
        setSelectedPlatform(platformId);
        setOpenDialog(true);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Delivery Platform Integrations</CardTitle>
                <CardDescription>Connect your accounts to automatically sync orders.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-56 w-full" />)
                ) : (
                    platforms.map(platform => {
                        const integration = integrationsMap.get(platform.id);
                        const isConnected = integration?.status === 'active';
                        return (
                            <Card key={platform.id} className="flex flex-col">
                                <CardHeader className="flex-row gap-4 items-center">
                                    <img src={platform.logo} alt={platform.name} className="w-8 h-8"/>
                                    <div>
                                        <CardTitle>{platform.name}</CardTitle>
                                        <CardDescription>
                                            {isConnected ? 'Connected' : 'Not Connected'}
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    {isConnected ? (
                                        <div className="space-y-2 text-sm text-muted-foreground">
                                            <p>Connected on: {integration?.connectedAt.toDate().toLocaleDateString()}</p>
                                            <p>Last sync: {integration?.lastSync ? integration.lastSync.toDate().toLocaleString() : 'Never'}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Connect your {platform.name} account to start syncing orders.</p>
                                    )}
                                </CardContent>
                                <CardFooter className="flex-wrap gap-2">
                                    {isConnected ? (
                                        <>
                                            <Button variant="outline" size="sm">Test Connection</Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDisconnect(platform.id)}>
                                                <Unplug className="mr-2 h-4 w-4"/> Disconnect
                                            </Button>
                                        </>
                                    ) : (
                                        <Button size="sm" onClick={() => openConnectDialog(platform.id)}>
                                            <LinkIcon className="mr-2 h-4 w-4"/> Connect
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        )
                    })
                )}
            </CardContent>
            
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Connect to {selectedPlatform}</DialogTitle>
                        <DialogDescription>
                            Enter your API key to connect your account. This key will be stored securely.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="api-key" className="text-right">API Key</Label>
                            <Input id="api-key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpenDialog(false)}>Cancel</Button>
                        <Button onClick={handleConnect} disabled={isSubmitting || !apiKey}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Connect
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}