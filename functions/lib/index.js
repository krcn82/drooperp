"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.myHandler = exports.createFinanzOnlineExport = exports.logError = exports.sendDailySystemReport = exports.updateLoyaltyPoints = exports.onNotificationCreate = exports.syncMenuWithPlatform = exports.syncIntegrationOrders = exports.integrationWebhook = exports.syncOfflineTransactions = exports.recordTransaction = exports.onKdsOrderUpdate = exports.paymentDeviceCallback = exports.startDevicePayment = exports.stripeWebhook = exports.processStripePayment = exports.generateZReport = exports.generateReport = exports.generateDatevExport = exports.automationWorker = exports.aiAutomationWorker = void 0;
/**
 * Initializes Firebase Admin SDK and exports all Cloud Functions.
 * This file acts as the main entry point for deploying functions.
 * It is structured to explicitly export each function for clarity.
 */
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK
// This is done once and the instance is shared across all functions
admin.initializeApp();
// AI Automation Workers
var aiAutomationWorker_1 = require("./aiAutomationWorker");
Object.defineProperty(exports, "aiAutomationWorker", { enumerable: true, get: function () { return aiAutomationWorker_1.aiAutomationWorker; } });
var automationWorker_1 = require("./automationWorker");
Object.defineProperty(exports, "automationWorker", { enumerable: true, get: function () { return automationWorker_1.automationWorker; } });
// Data Export and Reporting
var generateDatevExport_1 = require("./generateDatevExport");
Object.defineProperty(exports, "generateDatevExport", { enumerable: true, get: function () { return generateDatevExport_1.generateDatevExport; } });
var generateReport_1 = require("./generateReport");
Object.defineProperty(exports, "generateReport", { enumerable: true, get: function () { return generateReport_1.generateReport; } });
var generateZReport_1 = require("./generateZReport");
Object.defineProperty(exports, "generateZReport", { enumerable: true, get: function () { return generateZReport_1.generateZReport; } });
// Payment Processing
var stripe_1 = require("./stripe");
Object.defineProperty(exports, "processStripePayment", { enumerable: true, get: function () { return stripe_1.processStripePayment; } });
Object.defineProperty(exports, "stripeWebhook", { enumerable: true, get: function () { return stripe_1.stripeWebhook; } });
var paymentDevice_1 = require("./paymentDevice");
Object.defineProperty(exports, "startDevicePayment", { enumerable: true, get: function () { return paymentDevice_1.startDevicePayment; } });
Object.defineProperty(exports, "paymentDeviceCallback", { enumerable: true, get: function () { return paymentDevice_1.paymentDeviceCallback; } });
// Restaurant & POS
var restaurant_1 = require("./restaurant");
Object.defineProperty(exports, "onKdsOrderUpdate", { enumerable: true, get: function () { return restaurant_1.onKdsOrderUpdate; } });
var recordTransaction_1 = require("./recordTransaction");
Object.defineProperty(exports, "recordTransaction", { enumerable: true, get: function () { return recordTransaction_1.recordTransaction; } });
var syncOfflineTransactions_1 = require("./syncOfflineTransactions");
Object.defineProperty(exports, "syncOfflineTransactions", { enumerable: true, get: function () { return syncOfflineTransactions_1.syncOfflineTransactions; } });
// Integrations & Webhooks
var webhooks_1 = require("./webhooks");
Object.defineProperty(exports, "integrationWebhook", { enumerable: true, get: function () { return webhooks_1.integrationWebhook; } });
var syncIntegrationOrders_1 = require("./syncIntegrationOrders");
Object.defineProperty(exports, "syncIntegrationOrders", { enumerable: true, get: function () { return syncIntegrationOrders_1.syncIntegrationOrders; } });
var syncMenu_1 = require("./syncMenu");
Object.defineProperty(exports, "syncMenuWithPlatform", { enumerable: true, get: function () { return syncMenu_1.syncMenuWithPlatform; } });
// Notifications
var sendNotificationAlert_1 = require("./sendNotificationAlert");
Object.defineProperty(exports, "onNotificationCreate", { enumerable: true, get: function () { return sendNotificationAlert_1.onNotificationCreate; } });
// Loyalty
var loyalty_1 = require("./loyalty");
Object.defineProperty(exports, "updateLoyaltyPoints", { enumerable: true, get: function () { return loyalty_1.updateLoyaltyPoints; } });
// Monitoring and email are helpers, not exported as functions
var sendDailySystemReport_1 = require("./sendDailySystemReport");
Object.defineProperty(exports, "sendDailySystemReport", { enumerable: true, get: function () { return sendDailySystemReport_1.sendDailySystemReport; } });
// export { logFunctionExecution } from './functions-monitor';
// export { sendEmailNotification } from './email-notifications';
var error_logging_1 = require("./lib/error-logging");
Object.defineProperty(exports, "logError", { enumerable: true, get: function () { return error_logging_1.logError; } });
var createFinanzOnlineExport_1 = require("./pos/createFinanzOnlineExport");
Object.defineProperty(exports, "createFinanzOnlineExport", { enumerable: true, get: function () { return createFinanzOnlineExport_1.createFinanzOnlineExport; } });
var myHandler_1 = require("./myHandler");
Object.defineProperty(exports, "myHandler", { enumerable: true, get: function () { return myHandler_1.myHandler; } });
//# sourceMappingURL=index.js.map