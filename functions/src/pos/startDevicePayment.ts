
import { onCall, HttpsError } from "firebase-functions/v2/https";
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
