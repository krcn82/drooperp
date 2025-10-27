/**
 * Initializes Firebase Admin SDK and exports all Cloud Functions.
 */
import * as admin from 'firebase-admin';

admin.initializeApp();

// Export functions from their individual files
export * from './recordTransaction';
export * from './syncOfflineTransactions';
export * from './generateDatevExport';
export * from './restaurant';
export * from './aiAutomationWorker';
export * from './generateReport';
export * from './webhooks';
export * from './syncIntegrationOrders';
export * from './syncMenu';
export * from './automationWorker';
export * from './sendNotificationAlert';

    