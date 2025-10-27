import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Handles incoming webhooks from delivery platforms like Wolt and Foodora.
 * URL format: /integrationWebhook/wolt?tenantId=your_tenant_id
 */
export const integrationWebhook = functions.https.onRequest(async (req, res) => {
    // 1. Extract platform and tenantId from the request
    const pathParts = req.path.split('/');
    const platform = pathParts[pathParts.length - 1]; // e.g., 'wolt'
    const tenantId = req.query.tenantId as string;
    
    // 2. Authenticate the request
    const apiKey = req.headers['x-api-key'] as string;

    if (!platform || !tenantId || !apiKey) {
        console.warn('Webhook called with missing parameters', { path: req.path, tenantId });
        res.status(400).send('Bad Request: Missing platform, tenantId, or API key.');
        return;
    }

    const firestore = admin.firestore();

    try {
        const integrationRef = firestore.doc(`tenants/${tenantId}/integrations/${platform}`);
        const integrationDoc = await integrationRef.get();

        if (!integrationDoc.exists || integrationDoc.data()?.apiKey !== apiKey) {
            console.warn(`Webhook unauthorized for tenant ${tenantId} and platform ${platform}`);
            res.status(401).send('Unauthorized');
            return;
        }

        // 3. Parse the order payload
        const orderData = req.body;
        const { orderId, customer, items, totalAmount, paymentType, timestamp } = orderData;
        
        if (!orderId || !items || !totalAmount) {
            console.warn(`Webhook for tenant ${tenantId} received invalid order data`, orderData);
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
        
        await batch.commit();

        console.log(`Successfully processed webhook for order ${orderId} from ${platform} for tenant ${tenantId}`);
        res.status(200).send('OK');

    } catch (error) {
        console.error(`Error processing webhook for tenant ${tenantId}:`, error);
        res.status(500).send('Internal Server Error');
    }
});

    