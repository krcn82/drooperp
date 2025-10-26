import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Syncs an array of offline transactions to Firestore.
 */
export const syncOfflineTransactions = functions.https.onCall(async (data, context) => {
  const { tenantId, transactionsArray } = data;
  const uid = context.auth?.uid;

  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  if (!tenantId || !Array.isArray(transactionsArray) || transactionsArray.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid data: tenantId or transactionsArray.');
  }

  const firestore = admin.firestore();
  const batch = firestore.batch();
  const transactionsCollection = firestore.collection(`tenants/${tenantId}/transactions`);

  transactionsArray.forEach(transaction => {
    const docRef = transactionsCollection.doc(); // Auto-generate ID
    batch.set(docRef, {
      ...transaction,
      cashierUserId: uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      synced: true, // Mark as synced
    });
  });

  try {
    await batch.commit();
    return { success: true, message: `${transactionsArray.length} transactions synced successfully.` };
  } catch (error) {
    console.error('Error syncing offline transactions:', error);
    throw new functions.https.HttpsError('internal', 'An error occurred while syncing transactions.', error);
  }
});
