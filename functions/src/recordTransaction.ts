import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

/**
 * Records a single transaction in Firestore for a given tenant.
 */
export const recordTransaction = functions.https.onCall(async (data, context) => {
  const { tenantId, transactionData } = data;
  const uid = context.auth?.uid;

  // 1. Authentication and Authorization
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  // 2. Input Validation
  if (!tenantId || !transactionData) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required data: tenantId or transactionData.');
  }

  const {
    items,
    totalAmount,
    paymentMethod,
    cashierUserId,
    type,
    tableId,
  } = transactionData;

  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    !totalAmount ||
    !paymentMethod ||
    !cashierUserId ||
    !type
  ) {
    throw new functions.https.HttpsError('invalid-argument', 'TransactionData is missing required fields.');
  }

  // 3. Process Transaction
  try {
    // Calculate total from items to validate against totalAmount from client
    const calculatedTotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) { // Use a tolerance for floating point comparison
        throw new functions.https.HttpsError('invalid-argument', `Calculated total (${calculatedTotal}) does not match provided totalAmount (${totalAmount}).`);
    }

    const firestore = admin.firestore();
    const transactionRef = firestore.collection(`tenants/${tenantId}/transactions`).doc();
    const rksvSettingsRef = firestore.doc(`tenants/${tenantId}/settings/rksv`);

    // RKSV Signature Chaining
    const rksvDoc = await rksvSettingsRef.get();
    const rksvData = rksvDoc.data();
    let previousSignature = '0';
    if (rksvData && rksvData.lastSignature) {
        previousSignature = rksvData.lastSignature;
    }

    const currentTransactionString = JSON.stringify(transactionData);
    const signaturePayload = previousSignature + currentTransactionString;
    const currentSignature = crypto.createHash('sha256').update(signaturePayload).digest('hex');
    const qrCode = Buffer.from(signaturePayload).toString('base64');


    const finalTransactionData: any = {
      ...transactionData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      paidImmediately: paymentMethod === 'cash',
      signature: currentSignature,
      qrCode: qrCode,
    };
    
    // Ensure only "restaurant" type has a tableId
    if (type !== 'restaurant') {
        delete finalTransactionData.tableId;
    }

    // 4. Write to Firestore in a transaction to ensure atomicity
    await firestore.runTransaction(async (t) => {
        t.set(transactionRef, finalTransactionData);
        t.update(rksvSettingsRef, { lastSignature: currentSignature });
    });


    console.info(`Transaction ${transactionRef.id} recorded successfully for tenant ${tenantId}.`);

    // 5. Return success response
    return { status: 'success', transactionId: transactionRef.id, qrCode };
    
  } catch (error: any) {
    console.error('Error recording transaction:', error);
    if (error instanceof functions.https.HttpsError) {
        throw error; // Re-throw HttpsError
    }
    throw new functions.https.HttpsError('internal', 'An error occurred while recording the transaction.', error.message);
  }
});
