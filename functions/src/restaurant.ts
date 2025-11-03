
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from 'firebase-admin';

/**
 * Firestore trigger that sends a notification when an order status in a table's subcollection changes.
 */
export const onKdsOrderUpdate = onDocumentUpdated('/tenants/{tenantId}/tables/{tableId}/orders/{orderId}', async (event) => {
    const { tenantId, tableId, orderId } = event.params;
    
    if (!event.data) {
        return null;
    }
    const newValue = event.data.after.data();
    const oldValue = event.data.before.data();

    // Check if the status has actually changed
    if (newValue.status === oldValue.status) {
        return null;
    }
    
    console.log(`Order ${orderId} for table ${tableId} in tenant ${tenantId} changed status to ${newValue.status}`);

    const notificationPayload = {
      orderId: orderId,
      tableId: tableId,
      newStatus: newValue.status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      title: `Table ${tableId}: Order Update`,
      message: `An item is now ${newValue.status}.`,
      type: 'info',
      read: false,
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
