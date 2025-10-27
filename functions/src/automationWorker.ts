
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// Helper function to add a notification
const addNotification = (
  firestore: admin.firestore.Firestore,
  tenantId: string,
  title: string,
  message: string,
  type: 'info' | 'alert' | 'success' | 'insight' = 'info'
) => {
  const notification = {
    title,
    message,
    type,
    timestamp: Timestamp.now(),
    read: false,
  };
  return firestore.collection(`tenants/${tenantId}/notifications`).add(notification);
};

/**
 * Scheduled function that runs every 15 minutes to perform automated checks.
 */
export const automationWorker = functions.pubsub.schedule('every 15 minutes')
  .onRun(async (context) => {
    console.log('Starting 15-minute automation worker...');
    const firestore = admin.firestore();
    
    try {
      const tenantsSnapshot = await firestore.collection('tenants').where('status', '==', 'active').get();
      
      if (tenantsSnapshot.empty) {
        console.log('No active tenants found.');
        return null;
      }
      
      const workerPromises = tenantsSnapshot.docs.map(tenantDoc => 
        runChecksForTenant(firestore, tenantDoc.id)
      );
      
      await Promise.all(workerPromises);
      
      console.log('Successfully completed automation worker for all active tenants.');
      return null;

    } catch (error) {
      console.error('Error running automation worker:', error);
      return null;
    }
});

/**
 * Runs all automated checks for a single tenant.
 * @param firestore The Firestore admin instance.
 * @param tenantId The ID of the tenant to check.
 */
async function runChecksForTenant(firestore: admin.firestore.Firestore, tenantId: string) {
  console.log(`Running checks for tenant: ${tenantId}`);
  
  // Use a Set to prevent duplicate notifications in the same run
  const generatedNotificationMessages = new Set<string>();

  const createUniqueNotification = async (title: string, message: string, type: 'info' | 'alert' | 'success' | 'insight') => {
      if (!generatedNotificationMessages.has(message)) {
          await addNotification(firestore, tenantId, title, message, type);
          generatedNotificationMessages.add(message);
      }
  };

  try {
    const now = new Date();
    const isMidnight = now.getHours() === 0 && now.getMinutes() < 15;

    // Daily Summary Notification (runs once around midnight)
    if (isMidnight) {
        await createUniqueNotification(
            'Daily Summary Ready',
            'Your daily business summary is now available in the Reports tab.',
            'info'
        );
    }
    
    await checkHighOrderVolume(firestore, tenantId, createUniqueNotification);
    await checkIntegrationErrors(firestore, tenantId, createUniqueNotification);
    await checkBestSellerSpike(firestore, tenantId, createUniqueNotification);
    await checkLowStock(firestore, tenantId, createUniqueNotification);
    
  } catch (error) {
    console.error(`Failed to run checks for tenant ${tenantId}:`, error);
  }
}

async function checkHighOrderVolume(firestore: admin.firestore.Firestore, tenantId: string, createNotification: Function) {
    const tenMinutesAgo = Timestamp.fromMillis(Date.now() - 10 * 60 * 1000);
    const transactionsSnapshot = await firestore.collection(`tenants/${tenantId}/transactions`)
        .where('timestamp', '>=', tenMinutesAgo)
        .get();

    if (transactionsSnapshot.size > 20) {
        await createNotification(
            'High Order Volume',
            `High order traffic detected (${transactionsSnapshot.size} orders in the last 10 mins). Prepare kitchen team!`,
            'alert'
        );
    }
}

async function checkIntegrationErrors(firestore: admin.firestore.Firestore, tenantId: string, createNotification: Function) {
    const thirtyMinutesAgo = Timestamp.fromMillis(Date.now() - 30 * 60 * 1000);
    const integrationsSnapshot = await firestore.collection(`tenants/${tenantId}/integrations`).get();

    for (const doc of integrationsSnapshot.docs) {
        const integration = doc.data();
        if (integration.lastSync && integration.lastSync < thirtyMinutesAgo) {
            await createNotification(
                'Integration Alert',
                `⚠️ ${doc.id} connection appears inactive. Last sync was over 30 minutes ago.`,
                'alert'
            );
        }
    }
}

async function checkBestSellerSpike(firestore: admin.firestore.Firestore, tenantId: string, createNotification: Function) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const todaySales = await getProductSales(firestore, tenantId, todayStart, now);
    const yesterdaySales = await getProductSales(firestore, tenantId, yesterdayStart, todayStart);

    for (const productId in todaySales) {
        const todayQty = todaySales[productId].quantity;
        const yesterdayQty = yesterdaySales[productId]?.quantity || 0;
        
        if (yesterdayQty > 0 && todayQty / yesterdayQty >= 2) { // 200% increase
            await createNotification(
                'Trending Product',
                `Product "${todaySales[productId].name}" is trending! Sales have increased by over 200% today. Consider reordering stock.`,
                'insight'
            );
        }
    }
}

async function getProductSales(firestore: admin.firestore.Firestore, tenantId: string, startDate: Date, endDate: Date) {
    const sales: { [key: string]: { name: string; quantity: number } } = {};
    const transactionsSnapshot = await firestore.collection(`tenants/${tenantId}/transactions`)
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<', endDate)
        .get();
    
    transactionsSnapshot.forEach(doc => {
        const items = doc.data().items as { productId: string; name: string; qty: number }[];
        if (items) {
            items.forEach(item => {
                const id = item.productId || item.name;
                if (sales[id]) {
                    sales[id].quantity += item.qty;
                } else {
                    sales[id] = { name: item.name, quantity: item.qty };
                }
            });
        }
    });
    return sales;
}

async function checkLowStock(firestore: admin.firestore.Firestore, tenantId: string, createNotification: Function) {
    const productsSnapshot = await firestore.collection(`tenants/${tenantId}/products`)
        .where('quantity', '<', 5)
        .get();

    for (const doc of productsSnapshot.docs) {
        const product = doc.data();
        await createNotification(
            'Low Stock Warning',
            `Low stock: ${product.name} (only ${product.quantity} left).`,
            'alert'
        );
    }
}

    