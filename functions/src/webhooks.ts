
import { onRequest } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

/**
 * Handles incoming webhooks from delivery platforms like Wolt and Foodora.
 * URL format: /integrationWebhook/wolt?tenantId=your_tenant_id
 */
export const integrationWebhook = onRequest(async (req, res) => {
    // 1. Extract platform and tenantId from the request
    const pathParts = req.path.split('/');
    const platform = pathParts[pathParts.length - 1]; // e.g., 'wolt'
    const tenantId = req.query.tenantId as string;
    
    // 2. Authenticate the request
    const apiKey = req.headers['x-api-key'] as string;

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

    } catch (error) {
        console.error(`Error processing webhook for tenant ${tenantId}:`, error);
        // Log error to audit log
         await auditLogRef.set({
            platform: platform,
            endpoint: req.path,
            receivedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'failed',
            error: (error as Error).message || 'Internal Server Error',
            payloadHash: payloadHash
        });
        res.status(500).send('Internal Server Error');
    }
});
