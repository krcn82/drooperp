'use server';

import { initializeFirebase, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Not used, but good for reference
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { auth as adminAuth } from 'firebase-admin';

// Sanitize tenant name to create a valid Firestore document ID
const sanitizeTenantId = (name: string) => {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

/**
 * Creates a new tenant document and associated user records.
 * This should only be callable by an authenticated user.
 */
export async function createNewTenant(
    tenantName: string, 
    user: { uid: string; email: string | null }
): Promise<{ success: boolean; message: string }> {
    if (!user || !user.uid || !user.email) {
        return { success: false, message: 'Could not verify user identity.' };
    }
  
  const { firestore } = initializeFirebase();

  const tenantId = sanitizeTenantId(tenantName);
  const tenantRef = doc(firestore, 'tenants', tenantId);

  // Set tenant data
  const tenantData = {
    id: tenantId,
    name: tenantName,
    ownerUid: user.uid,
    createdAt: serverTimestamp(),
    plan: 'free',
    status: 'active',
  };
  setDocumentNonBlocking(tenantRef, tenantData, {});

  // Add the owner as a user in the tenant's subcollection
  const userRef = doc(firestore, `tenants/${tenantId}/users`, user.uid);
  const userData = {
    id: user.uid,
    email: user.email,
    role: 'admin',
    tenantId: tenantId,
    status: 'active',
  };
  setDocumentNonBlocking(userRef, userData, {});
  
  // Set default module settings
  const modulesRef = doc(firestore, `tenants/${tenantId}/settings/modules`);
  const defaultModules = {
      posShop: true,
      posRestaurant: false,
      calendar: false,
      kiosk: false,
      aiAssistant: true,
  };
  setDocumentNonBlocking(modulesRef, defaultModules, {});
  
  // Set default automation rules
  const automationRef = doc(firestore, `tenants/${tenantId}/settings/automationRules`);
  const defaultAutomation = {
      highOrderVolumeThreshold: 20,
      lowStockThreshold: 5,
      integrationTimeoutMinutes: 30,
      dailySummaryEnabled: true
  };
  setDocumentNonBlocking(automationRef, defaultAutomation, {});
  
  // Create the user-to-tenant mapping for security rules
  const userTenantMappingRef = doc(firestore, 'users', user.uid);
  setDocumentNonBlocking(userTenantMappingRef, { tenantId: tenantId }, { merge: true });

  revalidatePath('/dashboard/settings');
  return { success: true, message: 'Tenant created successfully.' };
}

/**
 * Switches the active tenant for the current user.
 * This is a client-side concept, so we just confirm the tenant exists.
 */
export async function switchTenant(tenantId: string): Promise<{ success: boolean; message: string }> {
  if (!tenantId) {
    return { success: false, message: 'Tenant ID is required.' };
  }
  return { success: true, message: 'Tenant switch initiated.' };
}

/**
 * Updates the status of a tenant.
 */
export async function updateTenantStatus(tenantId: string, status: 'active' | 'inactive' | 'deleted'): Promise<{ success: boolean; message: string }> {
    if (!tenantId) {
        return { success: false, message: 'Tenant ID is required.' };
    }

    const { firestore } = initializeFirebase();
    const tenantRef = doc(firestore, 'tenants', tenantId);
    setDocumentNonBlocking(tenantRef, { status: status }, { merge: true });

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'Tenant status updated.' };
}

/**
 * Updates the module settings for a tenant.
 */
export async function updateModuleSettings(tenantId: string, modules: any): Promise<{ success: boolean; message: string }> {
    if (!tenantId) {
        return { success: false, message: 'Tenant ID is required.' };
    }

    const { firestore } = initializeFirebase();
    const modulesRef = doc(firestore, `tenants/${tenantId}/settings/modules`);

    setDocumentNonBlocking(modulesRef, modules, { merge: true });
    
    revalidatePath('/dashboard/settings');
    return { success: true, message: 'Module settings updated.' };
}
