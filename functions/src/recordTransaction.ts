import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

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

    const finalTransactionData: any = {
      ...transactionData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      paidImmediately: paymentMethod === 'cash',
    };
    
    // Ensure only "restaurant" type has a tableId
    if (type !== 'restaurant') {
        delete finalTransactionData.tableId;
    }

    // 4. Write to Firestore
    await transactionRef.set(finalTransactionData);

    console.info(`Transaction ${transactionRef.id} recorded successfully for tenant ${tenantId}.`);

    // 5. Return success response
    return { status: 'success', transactionId: transactionRef.id };
    
  } catch (error: any) {
    console.error('Error recording transaction:', error);
    if (error instanceof functions.https.HttpsError) {
        throw error; // Re-throw HttpsError
    }
    throw new functions.https.HttpsError('internal', 'An error occurred while recording the transaction.', error.message);
  }
});
