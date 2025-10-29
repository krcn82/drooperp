
/**
 * Initializes Firebase Admin SDK and exports all Cloud Functions.
 * This file acts as the main entry point for deploying functions.
 * It is structured to explicitly export each function for clarity.
 */
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// This is done once and the instance is shared across all functions
admin.initializeApp();

// AI Automation Workers
export { aiAutomationWorker } from './aiAutomationWorker';
export { automationWorker } from './automationWorker';

// Data Export and Reporting
export { generateDatevExport } from './generateDatevExport';
export { generateReport } from './generateReport';
export { generateZReport } from './generateZReport';


// Payment Processing
export { processStripePayment, stripeWebhook } from './stripe';
export { startDevicePayment, paymentDeviceCallback } from './paymentDevice';

// Restaurant & POS
export { onKdsOrderUpdate } from './restaurant';
export { recordTransaction } from './recordTransaction';
export { syncOfflineTransactions } from './syncOfflineTransactions';

// Integrations & Webhooks
export { integrationWebhook } from './webhooks';
export { syncIntegrationOrders } from './syncIntegrationOrders';
export { syncMenuWithPlatform } from './syncMenu';

// Notifications
export { onNotificationCreate } from './sendNotificationAlert';

// Loyalty
export { updateLoyaltyPoints, getCustomerLoyalty } from './loyalty';

// Monitoring and email are helpers, not exported as functions
export { sendDailySystemReport } from './sendDailySystemReport';
// export { logFunctionExecution } from './functions-monitor';
// export { sendEmailNotification } from './email-notifications';

export { logError } from './lib/error-logging';
export { createFinanzOnlineExport } from './pos/createFinanzOnlineExport';

