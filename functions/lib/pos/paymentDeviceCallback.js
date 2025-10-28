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
exports.paymentDeviceCallback = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
/**
 * Handles the callback from the local payment bridge service.
 */
exports.paymentDeviceCallback = (0, https_1.onRequest)(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const { tenantId, paymentId, status, deviceResponse } = req.body;
    if (!tenantId || !paymentId || !status) {
        res.status(400).send('Bad Request: Missing required fields.');
        return;
    }
    const firestore = admin.firestore();
    const paymentRef = firestore.doc(`tenants/${tenantId}/payments/${paymentId}`);
    try {
        const paymentDoc = await paymentRef.get();
        if (!paymentDoc.exists) {
            throw new Error(`Payment document with ID ${paymentId} not found.`);
        }
        const transactionId = paymentDoc.data()?.transactionId;
        const batch = firestore.batch();
        // 1. Update the payment document
        batch.update(paymentRef, {
            status: status, // 'completed' or 'failed'
            deviceResponse: deviceResponse || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // 2. Update the corresponding transaction if payment was successful
        if (status === 'completed' && transactionId) {
            const transactionRef = firestore.doc(`tenants/${tenantId}/transactions/${transactionId}`);
            batch.update(transactionRef, {
                status: 'paid',
                paymentStatus: status,
                confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        // 3. Add to audit log
        const auditLogRef = firestore.collection(`tenants/${tenantId}/auditLogs`).doc();
        batch.set(auditLogRef, {
            type: 'paymentDeviceCallback',
            result: status,
            paymentId: paymentId,
            details: deviceResponse,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        // 4. Send notification
        const notificationRef = firestore.collection(`tenants/${tenantId}/notifications`).doc();
        batch.set(notificationRef, {
            type: status === "completed" ? 'success' : 'alert',
            title: status === "completed" ? "Payment Approved ✅" : "Payment Failed ❌",
            message: status === "completed"
                ? `Transaction for payment ${paymentId} approved by terminal ${deviceResponse?.terminalId}.`
                : `Transaction for payment ${paymentId} was declined or an error occurred.`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
        });
        await batch.commit();
        console.log(`✅ Payment callback processed for paymentId: ${paymentId}`);
        res.status(200).send({ success: true });
    }
    catch (error) {
        console.error('❌ Error processing payment device callback:', error);
        await firestore.collection(`tenants/${tenantId}/auditLogs`).add({
            type: 'paymentDeviceCallback',
            result: 'error',
            paymentId: paymentId,
            error: error.message,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(500).send('Internal Server Error');
    }
});
//# sourceMappingURL=paymentDeviceCallback.js.map