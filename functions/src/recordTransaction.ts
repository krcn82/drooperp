import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

/**
 * Records a single transaction in Firestore for a given tenant.
 * Can be used to create a new transaction from scratch (e.g. from POS)
 * or to confirm and sign a pending transaction (e.g. from a webhook).
 */
export const recordTransaction = functions.https.onCall(async (data, context) => {
  const { tenantId, transactionData } = data;
  const uid = context.auth?.uid;

  // 1. Authentication and Authorization
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  if (!tenantId || !transactionData) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required data: tenantId or transactionData.');
  }

  // Determine mode: creating new or confirming existing
  const isConfirming = !!transactionData.transactionId;

  const firestore = admin.firestore();
  const rksvSettingsRef = firestore.doc(`tenants/${tenantId}/settings/rksv`);

  try {
    const rksvDoc = await rksvSettingsRef.get();
    const rksvData = rksvDoc.data();
    if (!rksvData || !rksvData.rksvActive) {
        throw new functions.https.HttpsError('failed-precondition', 'RKSV is not active for this tenant.');
    }
    
    let transactionRef: admin.firestore.DocumentReference;
    let dataToSign: any;

    // A Firestore transaction is used to ensure atomicity
    const qrCode = await firestore.runTransaction(async (t) => {
        let previousSignature = rksvData.lastSignature || '0';

        if (isConfirming) {
            // CONFIRMING an existing pending transaction
            transactionRef = firestore.collection(`tenants/${tenantId}/transactions`).doc(transactionData.transactionId);
            const txDoc = await t.get(transactionRef);
            if (!txDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'The transaction to confirm does not exist.');
            }
            dataToSign = txDoc.data();
            
            const signaturePayload = previousSignature + JSON.stringify(dataToSign);
            const currentSignature = crypto.createHash('sha256').update(signaturePayload).digest('hex');
            const qrCodeData = Buffer.from(signaturePayload).toString('base64');
            
            t.update(transactionRef, {
                status: 'completed',
                cashierUserId: transactionData.cashierUserId,
                signature: currentSignature,
                qrCode: qrCodeData,
            });
            t.update(rksvSettingsRef, { lastSignature: currentSignature });

            // Also update the status of the related posOrder document
            const posOrderRef = firestore.doc(`tenants/${tenantId}/posOrders/${dataToSign.relatedPosOrderId}`);
            t.update(posOrderRef, { status: 'completed' });

            return qrCodeData;
        } else {
            // CREATING a new transaction from POS
            const { items, totalAmount, paymentMethod, cashierUserId, type } = transactionData;
            const calculatedTotal = items.reduce((acc: number, item: any) => acc + item.price * item.qty, 0);
            if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
                throw new functions.https.HttpsError('invalid-argument', 'Calculated total does not match provided totalAmount.');
            }
            
            transactionRef = firestore.collection(`tenants/${tenantId}/transactions`).doc();
            dataToSign = {
                ...transactionData,
                timestamp: admin.firestore.Timestamp.now(), // Use server timestamp for signing
            };

            const signaturePayload = previousSignature + JSON.stringify(dataToSign);
            const currentSignature = crypto.createHash('sha256').update(signaturePayload).digest('hex');
            const qrCodeData = Buffer.from(signaturePayload).toString('base64');

            t.set(transactionRef, {
                ...dataToSign,
                status: 'completed',
                paidImmediately: paymentMethod === 'cash',
                signature: currentSignature,
                qrCode: qrCodeData,
            });
            t.update(rksvSettingsRef, { lastSignature: currentSignature });
            
            return qrCodeData;
        }
    });

    console.info(`Transaction ${transactionRef.id} processed successfully for tenant ${tenantId}.`);
    return { status: 'success', transactionId: transactionRef.id, qrCode };

  } catch (error: any) {
    console.error('Error recording transaction:', error);
    if (error instanceof functions.https.HttpsError) {
        throw error;
    }
    throw new functions.https.HttpsError('internal', 'An error occurred while recording the transaction.', error.message);
  }
});

    