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
exports.updateLoyaltyPoints = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
/**
 * Calculates and updates a customer's loyalty points and visit history after a purchase.
 * Formula: 1 point for every €10 spent.
 */
exports.updateLoyaltyPoints = (0, https_1.onCall)(async (request) => {
    const { tenantId, customerId, orderId, totalAmount } = request.data;
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (!tenantId || !customerId || !orderId || totalAmount === undefined) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required data: tenantId, customerId, orderId, or totalAmount.');
    }
    const db = admin.firestore();
    const customerRef = db.doc(`tenants/${tenantId}/customers/${customerId}`);
    try {
        const customerDoc = await customerRef.get();
        if (!customerDoc.exists) {
            throw new https_1.HttpsError('not-found', `Customer with ID ${customerId} not found in tenant ${tenantId}.`);
        }
        const pointsEarned = Math.floor(totalAmount / 10);
        if (pointsEarned > 0) {
            const visitData = {
                orderId,
                total: totalAmount,
                pointsEarned,
                date: admin.firestore.FieldValue.serverTimestamp(),
            };
            await customerRef.update({
                loyaltyPoints: admin.firestore.FieldValue.increment(pointsEarned),
                lastVisit: admin.firestore.FieldValue.serverTimestamp(),
                visits: admin.firestore.FieldValue.arrayUnion(visitData),
            });
            return { success: true, pointsEarned: pointsEarned };
        }
        return { success: true, pointsEarned: 0, message: 'No points earned for this transaction.' };
    }
    catch (error) {
        console.error('Error updating loyalty points:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'An unexpected error occurred while updating loyalty points.');
    }
});
//# sourceMappingURL=loyalty.js.map