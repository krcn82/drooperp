import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Creates a new order for the Kitchen Display System (KDS).
 */
export const createKdsOrder = functions.https.onCall(async (data, context) => {
  const { tenantId, orderData } = data;
  const uid = context.auth?.uid;

  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  if (!tenantId || !orderData || !orderData.items || !orderData.tableId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required data: tenantId, items, or tableId.');
  }

  try {
    const firestore = admin.firestore();
    const kdsOrderRef = firestore.collection(`tenants/${tenantId}/kdsOrders`).doc();

    const newOrder = {
      items: orderData.items,
      tableId: orderData.tableId,
      status: 'pending', // Initial status
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: uid,
    };

    await kdsOrderRef.set(newOrder);

    return { success: true, orderId: kdsOrderRef.id };
  } catch (error) {
    console.error('Error creating KDS order:', error);
    throw new functions.https.HttpsError('internal', 'An error occurred while creating the KDS order.');
  }
});

/**
 * Updates the status of a KDS order.
 */
export const updateKdsOrderStatus = functions.https.onCall(async (data, context) => {
  const { tenantId, orderId, status } = data;
  const uid = context.auth?.uid;

  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  if (!tenantId || !orderId || !status) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required data: tenantId, orderId, or status.');
  }

  const validStatuses = ['pending', 'cooking', 'ready', 'served', 'canceled'];
  if (!validStatuses.includes(status)) {
    throw new functions.https.HttpsError('invalid-argument', `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  try {
    const firestore = admin.firestore();
    const orderRef = firestore.doc(`tenants/${tenantId}/kdsOrders/${orderId}`);

    await orderRef.update({
      status: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: `Order ${orderId} updated to ${status}.` };
  } catch (error) {
    console.error('Error updating KDS order status:', error);
    throw new functions.https.HttpsError('internal', 'An error occurred while updating the order status.');
  }
});
