
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';

type Transaction = {
  timestamp: admin.firestore.Timestamp;
  amountTotal: number;
  paymentMethod: string;
  items: { name: string; qty: number }[];
};

/**
 * Generates a DATEV-compatible CSV string from a tenant's transactions.
 */
export const generateDatevExport = onCall(async (request) => {
  const { tenantId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  
  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'Missing required data: tenantId.');
  }

  const firestore = admin.firestore();

  // Admin Check: Verify the user has the 'admin' role for this tenant.
  const userDoc = await firestore.doc(`tenants/${tenantId}/users/${uid}`).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'You must be an admin to generate a DATEV export.');
  }


  const transactionsSnapshot = await firestore.collection(`tenants/${tenantId}/transactions`).get();

  if (transactionsSnapshot.empty) {
    return { csv: '', message: 'No transactions found for the given period.' };
  }
  
  // NOTE: This is a simplified DATEV format. The official format is highly complex and specific.
  // This header matches the user's request.
  let csvContent = 'Date,TransactionID,AccountNumber,Amount,PaymentMethod,Description\n';
  
  transactionsSnapshot.forEach(doc => {
    const tx = doc.data() as Transaction;
    // Format date to DD.MM.YYYY
    const date = tx.timestamp.toDate().toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const transactionId = doc.id;
    const accountNumber = '8400'; // Example account for revenue
    const amount = tx.amountTotal.toFixed(2).replace('.', ','); // German decimal format
    const paymentMethod = tx.paymentMethod;
    const description = tx.items.map(item => `${item.qty}x ${item.name}`).join(', ');

    csvContent += `"${date}","${transactionId}","${accountNumber}","${amount}","${paymentMethod}","${description}"\n`;
  });

  return { csv: csvContent, message: 'Export generated successfully.' };
});

