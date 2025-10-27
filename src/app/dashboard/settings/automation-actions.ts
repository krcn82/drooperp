'use server';

import { initializeFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Updates the automation rules for a tenant.
 */
export async function updateAutomationRules(
    tenantId: string, 
    rules: any
): Promise<{ success: boolean; message: string }> {
    if (!tenantId) {
        return { success: false, message: 'Tenant ID is required.' };
    }

    const { firestore } = initializeFirebase();
    const rulesRef = doc(firestore, `tenants/${tenantId}/settings/automationRules`);

    const parsedRules = {
      highOrderVolumeThreshold: Number(rules.highOrderVolumeThreshold),
      lowStockThreshold: Number(rules.lowStockThreshold),
      integrationTimeoutMinutes: Number(rules.integrationTimeoutMinutes),
      dailySummaryEnabled: rules.dailySummaryEnabled === 'true' || rules.dailySummaryEnabled === true,
    }

    setDocumentNonBlocking(rulesRef, parsedRules, { merge: true });
    
    revalidatePath('/dashboard/settings');
    return { success: true, message: 'Automation rules updated.' };
}

    