import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Records a single transaction in Firestore for a given tenant.
 */
export const recordTransaction = functions.https.onCall(async (data, context) => {
  const { tenantId, transactionData } = data;
  const uid = context.auth?.uid;

  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  if (!tenantId || !transactionData) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required data: tenantId or transactionData.');
  }

  // Basic validation for transactionData
  if (!transactionData.productIds || !transactionData.amountTotal) {
     throw new functions.https.HttpsError('invalid-argument', 'transactionData is missing required fields.');
  }

  const firestore = admin.firestore();
  const transactionRef = firestore.collection(`tenants/${tenantId}/transactions`).doc();

  try {
    await transactionRef.set({
      ...transactionData,
      cashierUserId: uid, // Ensure the cashier is the authenticated user
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, transactionId: transactionRef.id };
  } catch (error) {
    console.error('Error recording transaction:', error);
    throw new functions.https.HttpsError('internal', 'An error occurred while recording the transaction.', error);
  }
});
