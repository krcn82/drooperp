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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDevicePayment = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * Initiates a payment on a local payment device by calling a bridge service.
 */
exports.startDevicePayment = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { tenantId, transactionId, paymentId, amount } = request.data;
    if (!tenantId || !transactionId || !paymentId || !amount) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required data fields.');
    }
    const firestore = admin.firestore();
    const idToken = request.auth.token;
    try {
        // 1. Get the payment bridge URL from tenant settings
        const settingsRef = firestore.doc(`tenants/${tenantId}/settings/general`);
        const settingsDoc = await settingsRef.get();
        const paymentBridgeUrl = settingsDoc.data()?.paymentBridgeUrl;
        if (!paymentBridgeUrl) {
            throw new https_1.HttpsError('not-found', 'Payment bridge URL is not configured for this tenant.');
        }
        // 2. Send command to the local payment bridge, including the auth token
        const response = await (0, node_fetch_1.default)(`${paymentBridgeUrl}/api/payment/device/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                tenantId,
                transactionId,
                paymentId,
                amount,
            }),
            timeout: 5000, // 5 second timeout for local network call
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Payment bridge returned an error: ${response.status} ${errorBody}`);
        }
        const responseData = await response.json();
        // Log the initiation
        await firestore.collection(`tenants/${tenantId}/auditLogs`).add({
            type: 'devicePaymentStart',
            result: 'success',
            paymentId: paymentId,
            details: responseData,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, message: 'Payment initiated on terminal.' };
    }
    catch (error) {
        console.error('Failed to start device payment:', error);
        await firestore.collection(`tenants/${tenantId}/auditLogs`).add({
            type: 'devicePaymentStart',
            result: 'error',
            paymentId: paymentId,
            error: error.message,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Could not communicate with the payment bridge.', error.message);
    }
});
//# sourceMappingURL=startDevicePayment.js.map