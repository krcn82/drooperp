
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logFunctionExecution } from './functions-monitor';

// Default automation rules if a tenant has not configured them
const defaultRules = {
  highOrderVolumeThreshold: 20,
  lowStockThreshold: 5,
  integrationTimeoutMinutes: 30,
  dailySummaryEnabled: true,
};

type AutomationRules = typeof defaultRules;

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

// Helper function to add an audit log
const addAuditLog = (
  firestore: admin.firestore.Firestore,
  tenantId: string,
  rule: string,
  details: Record<string, any> = {}
) => {
    const logEntry = {
        type: 'automationTrigger',
        rule: rule,
        triggeredAt: Timestamp.now(),
        tenantId: tenantId,
        details: details
    };
    return firestore.collection(`tenants/${tenantId}/auditLogs`).add(logEntry);
}


/**
 * Scheduled function that runs every 15 minutes to perform automated checks.
 */
export const automationWorker = onSchedule({ schedule: "every 15 minutes", timeZone: "Europe/Berlin" }, async (event) => {
    const start = Date.now();
    console.log('Starting 15-minute automation worker...');
    
    try {
      const firestore = admin.firestore();
      const tenantsSnapshot = await firestore.collection('tenants').where('status', '==', 'active').get();
      
      if (tenantsSnapshot.empty) {
        console.log('No active tenants found.');
        await logFunctionExecution('automationWorker', 'success', 'Completed: No active tenants found.', Date.now() - start);
        return;
      }
      
      const workerPromises = tenantsSnapshot.docs.map(tenantDoc => 
        runChecksForTenant(firestore, tenantDoc.id)
      );
      
      await Promise.all(workerPromises);
      
      console.log('Successfully completed automation worker for all active tenants.');
      await logFunctionExecution('automationWorker', 'success', 'Completed successfully for all active tenants.', Date.now() - start);

    } catch (error: any) {
      console.error('Error running automation worker:', error);
      await logFunctionExecution('automationWorker', 'error', error.message, Date.now() - start);
    }
});

/**
 * Fetches automation rules for a tenant, using defaults if not set.
 * @param firestore Firestore admin instance.
 * @param tenantId The ID of the tenant.
 * @returns The automation rules for the tenant.
 */
async function getAutomationRules(firestore: admin.firestore.Firestore, tenantId: string): Promise<AutomationRules> {
    const rulesRef = firestore.doc(`tenants/${tenantId}/settings/automationRules`);
    const doc = await rulesRef.get();
    if (!doc.exists) {
        return defaultRules;
    }
    // Merge tenant's rules with defaults to ensure all keys are present
    return { ...defaultRules, ...doc.data() };
}

/**
 * Runs all automated checks for a single tenant.
 * @param firestore The Firestore admin instance.
 * @param tenantId The ID of the tenant to check.
 */
async function runChecksForTenant(firestore: admin.firestore.Firestore, tenantId: string) {
  console.log(`Running checks for tenant: ${tenantId}`);
  
  const rules = await getAutomationRules(firestore, tenantId);

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
    if (isMidnight && rules.dailySummaryEnabled) {
        await createUniqueNotification(
            'Daily Summary Ready',
            'Your daily business summary is now available in the Reports tab.',
            'info'
        );
        await addAuditLog(firestore, tenantId, 'dailySummary');
    }
    
    await checkHighOrderVolume(firestore, tenantId, rules, createUniqueNotification);
    await checkIntegrationErrors(firestore, tenantId, rules, createUniqueNotification);
    await checkBestSellerSpike(firestore, tenantId, rules, createUniqueNotification);
    await checkLowStock(firestore, tenantId, rules, createUniqueNotification);

    // New payment and cash drawer checks
    await checkStripeErrors(firestore, tenantId, createUniqueNotification);
    await checkBankomatErrors(firestore, tenantId, createUniqueNotification);
    await checkStaleCashDrawers(firestore, tenantId, createUniqueNotification);
    await checkFailedPayments(firestore, tenantId, createUniqueNotification);
    
  } catch (error) {
    console.error(`Failed to run checks for tenant ${tenantId}:`, error);
    // Re-throw to be caught by the main worker's catch block
    throw error;
  }
}

async function checkHighOrderVolume(firestore: admin.firestore.Firestore, tenantId: string, rules: AutomationRules, createNotification: Function) {
    const tenMinutesAgo = Timestamp.fromMillis(Date.now() - 10 * 60 * 1000);
    const transactionsSnapshot = await firestore.collection(`tenants/${tenantId}/transactions`)
        .where('timestamp', '>=', tenMinutesAgo)
        .get();

    if (transactionsSnapshot.size > rules.highOrderVolumeThreshold) {
        await createNotification(
            'High Order Volume',
            `High order traffic detected (${transactionsSnapshot.size} orders in the last 10 mins). Prepare kitchen team!`,
            'alert'
        );
        await addAuditLog(firestore, tenantId, 'highOrderVolume', { transactionCount: transactionsSnapshot.size, threshold: rules.highOrderVolumeThreshold });
    }
}

async function checkIntegrationErrors(firestore: admin.firestore.Firestore, tenantId: string, rules: AutomationRules, createNotification: Function) {
    const timeoutMillis = Date.now() - rules.integrationTimeoutMinutes * 60 * 1000;
    const timeoutTimestamp = Timestamp.fromMillis(timeoutMillis);
    const integrationsSnapshot = await firestore.collection(`tenants/${tenantId}/integrations`).get();

    for (const doc of integrationsSnapshot.docs) {
        const integration = doc.data();
        if (integration.lastSync && integration.lastSync < timeoutTimestamp) {
            await createNotification(
                'Integration Alert',
                `⚠️ ${doc.id} connection appears inactive. Last sync was over ${rules.integrationTimeoutMinutes} minutes ago.`,
                'alert'
            );
            await addAuditLog(firestore, tenantId, 'integrationTimeout', { platform: doc.id, lastSync: integration.lastSync.toDate() });
        }
    }
}

async function checkBestSellerSpike(firestore: admin.firestore.Firestore, tenantId: string, rules: AutomationRules, createNotification: Function) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const todaySales = await getProductSales(firestore, tenantId, todayStart, now);
    const yesterdaySales = await getProductSales(firestore, tenantId, yesterdayStart, todayStart);

    for (const productId in todaySales) {
        const todayQty = todaySales[productId].quantity;
        const yesterdayQty = yesterdaySales[productId]?.quantity || 0;
        
        // Spike is defined as a 200% increase (doubling)
        if (yesterdayQty > 0 && todayQty / yesterdayQty >= 2) { 
            await createNotification(
                'Trending Product',
                `Product "${todaySales[productId].name}" is trending! Sales have increased by over 200% today. Consider reordering stock.`,
                'insight'
            );
            await addAuditLog(firestore, tenantId, 'bestSellerSpike', { productId: productId, productName: todaySales[productId].name, todayQty, yesterdayQty });
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

async function checkLowStock(firestore: admin.firestore.Firestore, tenantId: string, rules: AutomationRules, createNotification: Function) {
    const productsSnapshot = await firestore.collection(`tenants/${tenantId}/products`)
        .where('quantity', '<', rules.lowStockThreshold)
        .get();

    for (const doc of productsSnapshot.docs) {
        const product = doc.data();
        await createNotification(
            'Low Stock Warning',
            `Low stock: ${product.name} (only ${product.quantity} left).`,
            'alert'
        );
        await addAuditLog(firestore, tenantId, 'lowStock', { productId: doc.id, productName: product.name, quantity: product.quantity, threshold: rules.lowStockThreshold });
    }
}

/**
 * Checks for a high number of Stripe errors in the last hour.
 */
async function checkStripeErrors(firestore: admin.firestore.Firestore, tenantId: string, createNotification: Function) {
    const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
    const errorLogsSnapshot = await firestore.collection(`tenants/${tenantId}/auditLogs`)
        .where('type', '==', 'stripePaymentIntent')
        .where('result', '==', 'error')
        .where('timestamp', '>=', oneHourAgo)
        .get();

    const errorCount = errorLogsSnapshot.size;
    const stripeErrorThreshold = 3; 

    if (errorCount > stripeErrorThreshold) {
        await createNotification(
            'Stripe Payment Alert',
            'Stripe connection unstable. Multiple payment errors detected in the last hour.',
            'alert'
        );
        await addAuditLog(firestore, tenantId, 'stripeConnectionUnstable', { errorCount });
    }
}

/**
 * Checks for Bankomat terminal communication errors in the last 15 minutes.
 */
async function checkBankomatErrors(firestore: admin.firestore.Firestore, tenantId: string, createNotification: Function) {
    const fifteenMinutesAgo = Timestamp.fromMillis(Date.now() - 15 * 60 * 1000);
    const errorLogsSnapshot = await firestore.collection(`tenants/${tenantId}/auditLogs`)
        .where('type', '==', 'devicePaymentStart')
        .where('result', '==', 'error')
        .where('timestamp', '>=', fifteenMinutesAgo)
        .get();

    if (!errorLogsSnapshot.empty) {
        await createNotification(
            'Bankomat Payment Alert',
            'Bankomat device offline. Could not communicate with the local payment bridge.',
            'alert'
        );
        await addAuditLog(firestore, tenantId, 'bankomatOffline', { errorCount: errorLogsSnapshot.size });
    }
}

/**
 * Checks for cash drawers that have been open for more than 12 hours.
 */
async function checkStaleCashDrawers(firestore: admin.firestore.Firestore, tenantId: string, createNotification: Function) {
    const twelveHoursAgo = Timestamp.fromMillis(Date.now() - 12 * 60 * 60 * 1000);
    const staleDrawersSnapshot = await firestore.collection(`tenants/${tenantId}/cashRegisters`)
        .where('status', '==', 'open')
        .where('openedAt', '<', twelveHoursAgo)
        .get();

    for (const doc of staleDrawersSnapshot.docs) {
        const drawer = doc.data();
        await createNotification(
            'Cash Drawer Alert',
            `Cash drawer opened by ${drawer.cashierName} is still open after 12 hours. Please close the session.`,
            'alert'
        );
        await addAuditLog(firestore, tenantId, 'staleCashDrawer', { cashRegisterId: doc.id, cashierName: drawer.cashierName });
    }
}

/**
 * Checks for a high number of failed payments in the last hour.
 */
async function checkFailedPayments(firestore: admin.firestore.Firestore, tenantId: string, createNotification: Function) {
    const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
    const failedPaymentsSnapshot = await firestore.collection(`tenants/${tenantId}/payments`)
        .where('status', '==', 'failed')
        .where('timestamp', '>=', oneHourAgo)
        .get();
        
    const failedPaymentsThreshold = 3;

    if (failedPaymentsSnapshot.size > failedPaymentsThreshold) {
        await createNotification(
            'Multiple Payment Failures ⚠️',
            `${failedPaymentsSnapshot.size} failed payments detected within the last hour.`,
            'alert'
        );
        await addAuditLog(firestore, tenantId, 'multiplePaymentFailures', { failureCount: failedPaymentsSnapshot.size });
    }
}
