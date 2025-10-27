'use server';

import { initializeFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

type PlatformId = 'wolt' | 'foodora' | 'lieferando';

/**
 * Creates or updates an integration document for a tenant.
 */
export async function connectIntegration(tenantId: string, platformId: PlatformId, apiKey: string): Promise<{ success: boolean; message: string }> {
    if (!tenantId || !platformId || !apiKey) {
        return { success: false, message: 'Missing required data.' };
    }

    const { firestore } = initializeFirebase();
    const integrationRef = doc(firestore, `tenants/${tenantId}/integrations`, platformId);

    const data = {
        apiKey, // In a real app, this MUST be encrypted before storing.
        connectedAt: serverTimestamp(),
        lastSync: null,
        status: 'active' as const,
    };
    
    // Non-blocking write. Error will be caught by global handler.
    setDocumentNonBlocking(integrationRef, data, { merge: true });

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'Integration connected successfully.' };
}

/**
 * Deletes an integration document for a tenant.
 */
export async function disconnectIntegration(tenantId: string, platformId: PlatformId): Promise<{ success: boolean; message: string }> {
    if (!tenantId || !platformId) {
        return { success: false, message: 'Missing required data.' };
    }

    const { firestore } = initializeFirebase();
    const integrationRef = doc(firestore, `tenants/${tenantId}/integrations`, platformId);
    
    // For disconnection, we'll simply delete the document.
    // An alternative would be to set status to 'disconnected'.
    try {
        await deleteDoc(integrationRef);
    } catch (error: any) {
        console.error('Failed to disconnect integration:', error);
        return { success: false, message: error.message || 'An error occurred.' };
    }

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'Integration disconnected.' };
}

    