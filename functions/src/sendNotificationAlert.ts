
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from 'firebase-admin';

/**
 * A Firestore trigger that sends an email when a critical alert notification is created.
 * It relies on the Firebase "Trigger Email" extension, which listens for new documents
 * in a specified 'mail' collection.
 */
export const onNotificationCreate = onDocumentCreated('/tenants/{tenantId}/notifications/{notificationId}', async (event) => {
    
    if (!event.data) return null;
    const notification = event.data.data();
    const { tenantId } = event.params;

    // 1. Check if the notification is a critical alert
    if (notification.type !== 'alert') {
      console.log(`Notification ${event.params.notificationId} is not an alert. Skipping email.`);
      return null;
    }

    console.log(`Critical alert detected for tenant ${tenantId}. Preparing email.`);

    // 2. Get all admin users for the tenant to send them an email
    const firestore = admin.firestore();
    const usersSnapshot = await firestore.collection(`tenants/${tenantId}/users`)
        .where('role', '==', 'admin')
        .get();

    if (usersSnapshot.empty) {
        console.warn(`No admin users found for tenant ${tenantId} to send alert email.`);
        return null;
    }
    
    const adminEmails = usersSnapshot.docs.map(doc => doc.data().email);

    // 3. Create a new document in the 'mail' collection for the email extension to process
    const mailDoc = {
      to: adminEmails,
      message: {
        subject: `[Droop ERP Alert] ${notification.title}`,
        html: `
          <h1>New Alert for Your Business</h1>
          <p><strong>Alert:</strong> ${notification.title}</p>
          <p><strong>Details:</strong> ${notification.message}</p>
          <p><em>This is an automated notification from your Droop ERP system.</em></p>
        `,
      },
    };

    try {
      await firestore.collection('mail').add(mailDoc);
      console.log(`Email document created for alert to: ${adminEmails.join(', ')}`);
    } catch (error) {
      console.error('Error creating email document:', error);
      return null;
    }

    // 4. (Optional Stub) Send mobile push notification via FCM
    // To implement this, you would need to store user FCM tokens in their user profile.
    /*
    const tokens = usersSnapshot.docs.map(doc => doc.data().fcmToken).filter(Boolean);
    if (tokens.length > 0) {
      const payload = {
        notification: {
          title: `[Droop Alert] ${notification.title}`,
          body: notification.message,
        },
      };
      await admin.messaging().sendToDevice(tokens, payload);
      console.log(`Push notification sent to ${tokens.length} devices.`);
    }
    */

    return null;
  });
