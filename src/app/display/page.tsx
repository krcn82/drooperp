"use client";
import { useEffect, useState } from "react";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, Timestamp } from 'firebase/firestore';
import { Loader2, Gift, CheckCircle } from 'lucide-react';

interface DisplayState {
    total: number;
    customer?: {
        name: string;
        loyaltyPoints: number;
        bonusActive: boolean;
    };
    status: 'idle' | 'processing' | 'completed';
}

export default function CustomerDisplayPage() {
    const firestore = useFirestore();
    const [tenantId, setTenantId] = useState<string | null>(null);

    useEffect(() => {
        // This page is often opened in a new window, so we rely on localStorage
        // which would have been set during the cashier's login.
        const storedTenantId = localStorage.getItem('tenantId');
        setTenantId(storedTenantId);
    }, []);

    const displayDocRef = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return doc(firestore, `tenants/${tenantId}/display/current`);
    }, [firestore, tenantId]);

    const { data: displayState, isLoading } = useDoc<DisplayState>(displayDocRef);

    if (isLoading && !displayState) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
                <Loader2 className="h-12 w-12 animate-spin" />
            </div>
        );
    }
    
    const showWelcome = !displayState || displayState.status === 'idle' || displayState.total === 0;

    if (showWelcome) {
         return (
            <div className="h-screen flex items-center justify-center bg-gray-900 text-white text-3xl font-semibold text-center p-4">
                💳 Waiting for next transaction...
            </div>
         )
    }

    return (
        <div className="h-screen w-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col items-center justify-center p-8 space-y-6 transition-all">
            <div className="text-8xl font-bold tracking-tight">
                € {displayState.total?.toFixed(2) ?? "0.00"}
            </div>

            {displayState.customer ? (
                <div className="text-center space-y-2 p-6 rounded-lg bg-white/10">
                    <p className="text-4xl font-semibold">{displayState.customer.name}</p>
                    <p className="text-xl text-gray-300">
                        Loyalty Points: {displayState.customer.loyaltyPoints ?? 0}
                    </p>
                    {displayState.customer.bonusActive && (
                        <p className="text-green-400 text-2xl mt-2 animate-pulse flex items-center justify-center gap-2">
                            <Gift /> 5% Loyalty Bonus Active!
                        </p>
                    )}
                </div>
            ) : (
                <p className="text-2xl text-gray-400">No customer selected</p>
            )}

            <div className="text-3xl mt-8 font-medium">
                {displayState.status === 'processing' && <span className="text-yellow-300 flex items-center gap-2"><Loader2 className="animate-spin" />Processing Payment...</span>}
                {displayState.status === 'completed' && (
                    <div className="text-center space-y-4">
                        <span className="text-green-400 flex items-center gap-3"><CheckCircle size={40}/> Payment Complete!</span>
                        <p className="text-gray-200 text-2xl mt-4">Thank you! 👋</p>
                    </div>
                )}
            </div>
        </div>
    );
}
