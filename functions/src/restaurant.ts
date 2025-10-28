
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from 'firebase-admin';

/**
 * Creates a new order for the Kitchen Display System (KDS).
 */
export const createKdsOrder = onCall(async (request) => {
  const { tenantId, orderData } = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  if (!tenantId || !orderData || !orderData.items || !orderData.tableId) {
    throw new HttpsError('invalid-argument', 'Missing required data: tenantId, items, or tableId.');
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
    throw new HttpsError('internal', 'An error occurred while creating the KDS order.');
  }
});

/**
 * Updates the status of a KDS order.
 */
export const updateKdsOrderStatus = onCall(async (request) => {
  const { tenantId, orderId, status } = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  if (!tenantId || !orderId || !status) {
    throw new HttpsError('invalid-argument', 'Missing required data: tenantId, orderId, or status.');
  }

  const validStatuses = ['pending', 'cooking', 'ready', 'served', 'canceled'];
  if (!validStatuses.includes(status)) {
    throw new HttpsError('invalid-argument', `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
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
    throw new HttpsError('internal', 'An error occurred while updating the order status.');
  }
});

/**
 * Firestore trigger that sends a notification when a KDS order status changes.
 */
export const onKdsOrderUpdate = onDocumentUpdated('/tenants/{tenantId}/kdsOrders/{orderId}', async (event) => {
    const { tenantId, orderId } = event.params;
    
    if (!event.data) {
        return null;
    }
    const newValue = event.data.after.data();
    const oldValue = event.data.before.data();

    // Check if the status has actually changed
    if (newValue.status === oldValue.status) {
        return null;
    }
    
    console.log(`KDS order ${orderId} in tenant ${tenantId} changed status to ${newValue.status}`);

    const notificationPayload = {
      orderId: orderId,
      tableId: newValue.tableId,
      newStatus: newValue.status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    try {
      await admin.firestore()
        .collection(`tenants/${tenantId}/notifications`)
        .add(notificationPayload);

      console.log(`Notification sent for order ${orderId}.`);
      return null;
    } catch (error) {
      console.error(`Failed to send notification for order ${orderId}:`, error);
      return null;
    }
  });
