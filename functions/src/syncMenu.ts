import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { AnyData } from './types';

/**
 * A callable function to sync a tenant's product menu with an external platform.
 * This is a placeholder for a future enhancement.
 */
export const syncMenuWithPlatform = onCall(async (request: CallableRequest<AnyData>) => {
    const { tenantId, platform } = request.data as { tenantId?: string; platform?: string };
    const uid = request.auth?.uid;

    if (!uid) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    if (!tenantId || !platform) {
        throw new HttpsError('invalid-argument', 'Missing required data: tenantId or platform.');
    }

    const firestore = admin.firestore();

    try {
        // 1. Fetch current product list from Firestore
        const productsSnapshot = await firestore.collection(`tenants/${tenantId}/products`).get();
        if (productsSnapshot.empty) {
            console.log(`No products found for tenant ${tenantId}. Skipping menu sync.`);
            return { success: true, message: 'No products to sync.' };
        }
        const products = productsSnapshot.docs.map(doc => doc.data());

        // 2. --- STUB: Push to platform menu API ---
        // In a real implementation, you would format the `products` array into the
        // structure required by the platform's menu API and make a POST/PUT request.
        console.log(`[STUB] Syncing ${products.length} products for tenant ${tenantId} to platform ${platform}.`);
        // Example of what a real API call might look like:
        //
        // const fetch = require('node-fetch');
        // const integrationDoc = await firestore.doc(`tenants/${tenantId}/integrations/${platform}`).get();
        // const apiKey = integrationDoc.data()?.apiKey;
        //
        // if (!apiKey) {
        //   throw new Error(`API key for ${platform} not found.`);
        // }
        //
        // const response = await fetch(`https://api.${platform}.com/v1/menu`, {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${apiKey}`,
        //     'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify({ items: products })
        // });
        //
        // if (!response.ok) {
        //   const errorBody = await response.text();
        //   throw new Error(`API call failed with status ${response.status}: ${errorBody}`);
        // }

        // 3. Update the menuSync timestamp on the integration document
        const integrationRef = firestore.doc(`tenants/${tenantId}/integrations/${platform}`);
        await integrationRef.update({
            lastMenuSync: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, message: `Menu sync with ${platform} completed successfully.` };

    } catch (error: any) {
        console.error(`Error syncing menu for tenant ${tenantId} with ${platform}:`, error);
        throw new HttpsError('internal', 'An unexpected error occurred during menu sync.', error.message);
    }
});
