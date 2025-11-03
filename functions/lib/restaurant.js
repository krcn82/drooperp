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
exports.onKdsOrderUpdate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
/**
 * Firestore trigger that sends a notification when an order status in a table's subcollection changes.
 */
exports.onKdsOrderUpdate = (0, firestore_1.onDocumentUpdated)('/tenants/{tenantId}/tables/{tableId}/orders/{orderId}', async (event) => {
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
    }
    catch (error) {
        console.error(`Failed to send notification for order ${orderId}:`, error);
        return null;
    }
});
//# sourceMappingURL=restaurant.js.map