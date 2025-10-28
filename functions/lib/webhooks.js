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
exports.integrationWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
/**
 * Handles incoming webhooks from delivery platforms like Wolt and Foodora.
 * URL format: /integrationWebhook/wolt?tenantId=your_tenant_id
 */
exports.integrationWebhook = (0, https_1.onRequest)(async (req, res) => {
    // 1. Extract platform and tenantId from the request
    const pathParts = req.path.split('/');
    const platform = pathParts[pathParts.length - 1]; // e.g., 'wolt'
    const tenantId = req.query.tenantId;
    // 2. Authenticate the request
    const apiKey = req.headers['x-api-key'];
    const firestore = admin.firestore();
    const auditLogRef = firestore.collection(`tenants/${tenantId}/auditLogs`).doc();
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
    if (!platform || !tenantId || !apiKey) {
        console.warn('Webhook called with missing parameters', { path: req.path, tenantId });
        await auditLogRef.set({
            platform: platform || 'unknown',
            endpoint: req.path,
            receivedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'failed',
            error: 'Missing platform, tenantId, or API key.',
            payloadHash: payloadHash
        });
        res.status(400).send('Bad Request: Missing platform, tenantId, or API key.');
        return;
    }
    try {
        const integrationRef = firestore.doc(`tenants/${tenantId}/integrations/${platform}`);
        const integrationDoc = await integrationRef.get();
        if (!integrationDoc.exists || integrationDoc.data()?.apiKey !== apiKey) {
            console.warn(`Webhook unauthorized for tenant ${tenantId} and platform ${platform}`);
            await auditLogRef.set({
                platform: platform,
                endpoint: req.path,
                receivedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'failed',
                error: 'Unauthorized',
                payloadHash: payloadHash
            });
            res.status(401).send('Unauthorized');
            return;
        }
        // 3. Parse the order payload
        const orderData = req.body;
        const { orderId, customer, items, totalAmount, paymentType, timestamp } = orderData;
        if (!orderId || !items || !totalAmount) {
            console.warn(`Webhook for tenant ${tenantId} received invalid order data`, orderData);
            await auditLogRef.set({
                platform: platform,
                endpoint: req.path,
                receivedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'failed',
                error: 'Invalid order payload',
                payloadHash: payloadHash
            });
            res.status(400).send('Bad Request: Invalid order payload.');
            return;
        }
        // 4. Create documents in a batch/transaction for atomicity
        const batch = firestore.batch();
        // Create a reference for the new transaction first to get its ID
        const transactionRef = firestore.collection(`tenants/${tenantId}/transactions`).doc();
        // 4a. Write to /posOrders
        const posOrderRef = firestore.doc(`tenants/${tenantId}/posOrders/${orderId}`);
        batch.set(posOrderRef, {
            ...orderData,
            source: platform,
            tenantId: tenantId,
            receivedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending', // Initial status for POS UI
            relatedTransactionId: transactionRef.id, // Link to the transaction
        });
        // 4b. Write to /transactions with a pending status
        batch.set(transactionRef, {
            amountTotal: totalAmount,
            source: platform,
            status: 'pending',
            timestamp: timestamp ? admin.firestore.Timestamp.fromDate(new Date(timestamp)) : admin.firestore.FieldValue.serverTimestamp(),
            type: 'sale',
            items: items,
            customer: customer,
            paymentMethod: paymentType,
            relatedPosOrderId: orderId,
        });
        // 4c. Write successful audit log
        batch.set(auditLogRef, {
            platform: platform,
            endpoint: req.path,
            receivedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'success',
            payloadHash: payloadHash
        });
        await batch.commit();
        console.log(`Successfully processed webhook for order ${orderId} from ${platform} for tenant ${tenantId}`);
        res.status(200).send('OK');
    }
    catch (error) {
        console.error(`Error processing webhook for tenant ${tenantId}:`, error);
        // Log error to audit log
        await auditLogRef.set({
            platform: platform,
            endpoint: req.path,
            receivedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'failed',
            error: error.message || 'Internal Server Error',
            payloadHash: payloadHash
        });
        res.status(500).send('Internal Server Error');
    }
});
//# sourceMappingURL=webhooks.js.map