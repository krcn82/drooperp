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
exports.onKdsOrderUpdate = exports.updateKdsOrderStatus = exports.createKdsOrder = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
/**
 * Creates a new order for the Kitchen Display System (KDS).
 */
exports.createKdsOrder = (0, https_1.onCall)(async (request) => {
    const { tenantId, orderData } = request.data;
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (!tenantId || !orderData || !orderData.items || !orderData.tableId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required data: tenantId, items, or tableId.');
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
    }
    catch (error) {
        console.error('Error creating KDS order:', error);
        throw new https_1.HttpsError('internal', 'An error occurred while creating the KDS order.');
    }
});
/**
 * Updates the status of a KDS order.
 */
exports.updateKdsOrderStatus = (0, https_1.onCall)(async (request) => {
    const { tenantId, orderId, status } = request.data;
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (!tenantId || !orderId || !status) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required data: tenantId, orderId, or status.');
    }
    const validStatuses = ['pending', 'cooking', 'ready', 'served', 'canceled'];
    if (!validStatuses.includes(status)) {
        throw new https_1.HttpsError('invalid-argument', `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    try {
        const firestore = admin.firestore();
        const orderRef = firestore.doc(`tenants/${tenantId}/kdsOrders/${orderId}`);
        await orderRef.update({
            status: status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, message: `Order ${orderId} updated to ${status}.` };
    }
    catch (error) {
        console.error('Error updating KDS order status:', error);
        throw new https_1.HttpsError('internal', 'An error occurred while updating the order status.');
    }
});
/**
 * Firestore trigger that sends a notification when a KDS order status changes.
 */
exports.onKdsOrderUpdate = (0, firestore_1.onDocumentUpdated)('/tenants/{tenantId}/kdsOrders/{orderId}', async (event) => {
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
    }
    catch (error) {
        console.error(`Failed to send notification for order ${orderId}:`, error);
        return null;
    }
});
//# sourceMappingURL=restaurant.js.map