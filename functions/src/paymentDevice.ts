

import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

/**
 * Initiates a payment on a local payment device by calling a bridge service.
 */
export const startDevicePayment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const { tenantId, transactionId, paymentId, amount } = request.data;
  if (!tenantId || !transactionId || !paymentId || !amount) {
    throw new HttpsError('invalid-argument', 'Missing required data fields.');
  }

  const firestore = admin.firestore();
  const idToken = request.auth.token;

  try {
    // 1. Get the payment bridge URL from tenant settings
    const settingsRef = firestore.doc(`tenants/${tenantId}/settings/general`);
    const settingsDoc = await settingsRef.get();
    const paymentBridgeUrl = settingsDoc.data()?.paymentBridgeUrl;

    if (!paymentBridgeUrl) {
      throw new HttpsError('not-found', 'Payment bridge URL is not configured for this tenant.');
    }

    // 2. Send command to the local payment bridge, including the auth token
    const response = await fetch(`${paymentBridgeUrl}/api/payment/device/start`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        tenantId,
        transactionId,
        paymentId,
        amount,
      }),
      timeout: 5000, // 5 second timeout for local network call
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Payment bridge returned an error: ${response.status} ${errorBody}`);
    }

    const responseData = await response.json();
    
    // Log the initiation
    await firestore.collection(`tenants/${tenantId}/auditLogs`).add({
        type: 'devicePaymentStart',
        result: 'success',
        paymentId: paymentId,
        details: responseData,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: 'Payment initiated on terminal.' };

  } catch (error: any) {
    console.error('Failed to start device payment:', error);
    await firestore.collection(`tenants/${tenantId}/auditLogs`).add({
        type: 'devicePaymentStart',
        result: 'error',
        paymentId: paymentId,
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    if (error instanceof HttpsError) {
        throw error;
    }
    throw new HttpsError('internal', 'Could not communicate with the payment bridge.', error.message);
  }
});


/**
 * Handles the callback from the local payment bridge service.
 */
export const paymentDeviceCallback = onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const { tenantId, paymentId, status, deviceResponse } = req.body;
    if (!tenantId || !paymentId || !status) {
        res.status(400).send('Bad Request: Missing required fields.');
        return;
    }

    const firestore = admin.firestore();
    const paymentRef = firestore.doc(`tenants/${tenantId}/payments/${paymentId}`);

    try {
        const paymentDoc = await paymentRef.get();
        if (!paymentDoc.exists) {
            throw new Error(`Payment document with ID ${paymentId} not found.`);
        }
        const transactionId = paymentDoc.data()?.transactionId;

        const batch = firestore.batch();

        // 1. Update the payment document
        batch.update(paymentRef, {
            status: status, // 'completed' or 'failed'
            deviceResponse: deviceResponse || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 2. Update the corresponding transaction if payment was successful
        if (status === 'completed' && transactionId) {
            const transactionRef = firestore.doc(`tenants/${tenantId}/transactions/${transactionId}`);
            batch.update(transactionRef, { 
                status: 'paid',
                paymentStatus: status,
                confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        
        // 3. Add to audit log
        const auditLogRef = firestore.collection(`tenants/${tenantId}/auditLogs`).doc();
        batch.set(auditLogRef, {
            type: 'paymentDeviceCallback',
            result: status,
            paymentId: paymentId,
            details: deviceResponse,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // 4. Send notification
        const notificationRef = firestore.collection(`tenants/${tenantId}/notifications`).doc();
        batch.set(notificationRef, {
            type: status === "completed" ? 'success' : 'alert',
            title: status === "completed" ? "Payment Approved ✅" : "Payment Failed ❌",
            message: status === "completed"
                ? `Transaction for payment ${paymentId} approved by terminal ${deviceResponse?.terminalId}.`
                : `Transaction for payment ${paymentId} was declined or an error occurred.`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
        });

        await batch.commit();

        console.log(`✅ Payment callback processed for paymentId: ${paymentId}`);
        res.status(200).send({ success: true });

    } catch (error: any) {
        console.error('❌ Error processing payment device callback:', error);
         await firestore.collection(`tenants/${tenantId}/auditLogs`).add({
            type: 'paymentDeviceCallback',
            result: 'error',
            paymentId: paymentId,
            error: error.message,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(500).send('Internal Server Error');
    }
});
