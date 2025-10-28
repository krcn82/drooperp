"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNotificationCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
/**
 * A Firestore trigger that sends an email when a critical alert notification is created.
 * It relies on the Firebase "Trigger Email" extension, which listens for new documents
 * in a specified 'mail' collection.
 */
exports.onNotificationCreate = (0, firestore_1.onDocumentCreated)('/tenants/{tenantId}/notifications/{notificationId}', async (event) => {
    if (!event.data)
        return null;
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
    }
    catch (error) {
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
//# sourceMappingURL=sendNotificationAlert.js.map