
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * A scheduled function that runs every 5 minutes to poll for new orders
 * from integrated delivery platforms, in case a webhook was missed.
 */
export const syncIntegrationOrders = onSchedule({ schedule: 'every 5 minutes', timeZone: 'Europe/Berlin' }, async (event) => {
    
    console.log('Starting 5-minute integration order sync...');
    const firestore = admin.firestore();
    
    try {
      const tenantsSnapshot = await firestore.collection('tenants').where('status', '==', 'active').get();
      
      if (tenantsSnapshot.empty) {
        console.log('No active tenants found. Exiting sync job.');
        return;
      }
      
      const syncPromises = tenantsSnapshot.docs.map(tenantDoc => 
        syncOrdersForTenant(firestore, tenantDoc.id)
      );
      
      await Promise.all(syncPromises);
      
      console.log('Successfully completed integration order sync for all tenants.');
      return;

    } catch (error) {
      console.error('Error running integration order sync:', error);
      return;
    }
});

/**
 * Fetches active integrations for a tenant and syncs orders for each.
 * @param firestore The Firestore admin instance.
 * @param tenantId The ID of the tenant to sync.
 */
async function syncOrdersForTenant(firestore: admin.firestore.Firestore, tenantId: string) {
  console.log(`Checking for active integrations for tenant: ${tenantId}`);
  
  const integrationsSnapshot = await firestore.collection(`tenants/${tenantId}/integrations`)
    .where('status', '==', 'active').get();

  if (integrationsSnapshot.empty) {
    return; // No active integrations for this tenant
  }

  for (const integrationDoc of integrationsSnapshot.docs) {
    const platformId = integrationDoc.id;
    const integrationData = integrationDoc.data();
    console.log(`Syncing ${platformId} for tenant ${tenantId}`);

    try {
      // This is a placeholder. In a real implementation, you would make an API call
      // to the platform's order endpoint using a stored API key.
      const newOrders = await fetchNewOrdersFromPlatform(platformId, integrationData.apiKey);

      if (newOrders && newOrders.length > 0) {
        await processNewOrders(firestore, tenantId, platformId, newOrders);
      }

      // Log successful sync
      await integrationDoc.ref.update({
        lastSync: Timestamp.now(),
        lastSyncStatus: 'success',
      });

    } catch (error: any) {
      console.error(`Failed to sync ${platformId} for tenant ${tenantId}:`, error);
      await integrationDoc.ref.update({
        lastSync: Timestamp.now(),
        lastSyncStatus: 'error',
        lastSyncError: error.message,
      });
    }
  }
}

/**
 * --- STUB FUNCTION ---
 * Placeholder for making a real API call to a delivery platform.
 * @param platformId The ID of the platform (e.g., 'wolt', 'foodora').
 * @param apiKey The API key for authentication.
 * @returns A promise that resolves to an array of new order objects.
 */
async function fetchNewOrdersFromPlatform(platformId: string, apiKey: string): Promise<any[]> {
  // In a real-world scenario, you would use a library like 'node-fetch'
  // to make an authenticated GET request to the platform's API endpoint.

  // const fetch = require('node-fetch');
  // let url;
  // switch (platformId) {
  //   case 'wolt': url = 'https://api.wolt.com/v1/orders'; break;
  //   case 'foodora': url = 'https://api.foodora.com/v1/orders'; break;
  //   default: throw new Error(`Unknown platform: ${platformId}`);
  // }
  //
  // const response = await fetch(url, {
  //   headers: { 'Authorization': `Bearer ${apiKey}` }
  // });
  // if (!response.ok) {
  //   throw new Error(`API request failed with status ${response.status}`);
  // }
  // const data = await response.json();
  // return data.orders; // Assuming the API returns an object with an 'orders' array

  console.log(`[STUB] Fetching new orders for ${platformId}. No real API call is made.`);
  
  // Return an empty array to simulate no new orders.
  return Promise.resolve([]);
}

/**
 * Processes new orders fetched from a platform API.
 * It checks which orders are truly new and writes them to Firestore.
 * @param firestore The Firestore admin instance.
 * @param tenantId The tenant ID.
 * @param platformId The platform ID.
 * @param orders The array of order objects from the API.
 */
async function processNewOrders(firestore: admin.firestore.Firestore, tenantId: string, platformId: string, orders: any[]) {
    const posOrdersRef = firestore.collection(`tenants/${tenantId}/posOrders`);
    let newOrderCount = 0;

    for (const order of orders) {
        const orderId = order.id.toString();
        const existingOrderRef = posOrdersRef.doc(orderId);
        const docSnap = await existingOrderRef.get();

        if (docSnap.exists) {
            continue; // Order already exists, skip it.
        }

        // Order is new, create the posOrder and transaction documents
        const batch = firestore.batch();
        const transactionRef = firestore.collection(`tenants/${tenantId}/transactions`).doc();

        // 1. Create the /posOrders document
        batch.set(existingOrderRef, {
            ...order,
            source: platformId,
            tenantId: tenantId,
            receivedAt: Timestamp.now(),
            status: 'pending',
            relatedTransactionId: transactionRef.id,
        });

        // 2. Create the corresponding /transactions document
        batch.set(transactionRef, {
            amountTotal: order.totalAmount,
            source: platformId,
            status: 'pending',
            timestamp: order.timestamp ? Timestamp.fromDate(new Date(order.timestamp)) : Timestamp.now(),
            type: 'sale',
            items: order.items,
            customer: order.customer,
            paymentMethod: order.paymentType,
            relatedPosOrderId: orderId,
        });

        await batch.commit();
        newOrderCount++;
    }

    if (newOrderCount > 0) {
        console.log(`Inserted ${newOrderCount} new orders from ${platformId} for tenant ${tenantId}.`);

        if (newOrderCount > 10) {
            // High volume notification logic
            await firestore.collection(`tenants/${tenantId}/notifications`).add({
                type: 'alert',
                message: `High order volume detected: ${newOrderCount} new orders from ${platformId} in the last 5 minutes.`,
                timestamp: Timestamp.now(),
                read: false,
            });
        }
    }
}
