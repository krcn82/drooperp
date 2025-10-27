
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

/**
 * Initiates a payment on a local payment device by calling a bridge service.
 */
export const startDevicePayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const { tenantId, transactionId, paymentId, amount } = data;
  if (!tenantId || !transactionId || !paymentId || !amount) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required data fields.');
  }

  const firestore = admin.firestore();

  try {
    // 1. Get the payment bridge URL from tenant settings
    const settingsRef = firestore.doc(`tenants/${tenantId}/settings/general`);
    const settingsDoc = await settingsRef.get();
    const paymentBridgeUrl = settingsDoc.data()?.paymentBridgeUrl;

    if (!paymentBridgeUrl) {
      throw new functions.https.HttpsError('not-found', 'Payment bridge URL is not configured for this tenant.');
    }

    // 2. Construct callback URL for the bridge to report back to
    const region = process.env.FUNCTION_REGION || 'us-central1';
    const projectId = process.env.GCLOUD_PROJECT;
    const callbackUrl = `https://${region}-${projectId}.cloudfunctions.net/paymentDeviceCallback`;

    // 3. Send command to the local payment bridge
    const response = await fetch(`${paymentBridgeUrl}/api/payment/device/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        transactionId,
        paymentId,
        amount,
        callbackUrl
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
    throw new functions.https.HttpsError('internal', 'Could not communicate with the payment bridge.', error.message);
  }
});


/**
 * Handles the callback from the local payment bridge service.
 */
export const paymentDeviceCallback = functions.https.onRequest(async (req, res) => {
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
        await paymentRef.update({
            status: status, // 'completed' or 'failed'
            deviceResponse: deviceResponse || null,
        });

        // Also update the transaction status if payment was completed
        if (status === 'completed') {
            const paymentDoc = await paymentRef.get();
            const transactionId = paymentDoc.data()?.transactionId;
            if (transactionId) {
                const transactionRef = firestore.doc(`tenants/${tenantId}/transactions/${transactionId}`);
                await transactionRef.update({ status: 'paid' });
            }
        }
        
        await firestore.collection(`tenants/${tenantId}/auditLogs`).add({
            type: 'devicePaymentCallback',
            result: status,
            paymentId: paymentId,
            details: deviceResponse,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Payment callback processed for paymentId: ${paymentId}`);
        res.status(200).send({ success: true });
        
        // TODO: In a real app, you might trigger a push notification to the POS UI here.

    } catch (error: any) {
        console.error('Error processing payment device callback:', error);
         await firestore.collection(`tenants/${tenantId}/auditLogs`).add({
            type: 'devicePaymentCallback',
            result: 'error',
            paymentId: paymentId,
            error: error.message,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(500).send('Internal Server Error');
    }
});

    