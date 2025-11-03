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
exports.generateZReport = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
/**
 * Generates a Z-Report for a given cash register session.
 * Calculates totals and updates the cash register document.
 */
exports.generateZReport = (0, https_1.onCall)(async (request) => {
    const { tenantId, cashRegisterId } = request.data;
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (!tenantId || !cashRegisterId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required data: tenantId or cashRegisterId.');
    }
    const firestore = admin.firestore();
    const registerRef = firestore.doc(`tenants/${tenantId}/cashRegisters/${cashRegisterId}`);
    try {
        const registerDoc = await registerRef.get();
        if (!registerDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Cash register session not found.');
        }
        const registerData = registerDoc.data();
        // 1. Find all payments for this cash register session
        const paymentsSnapshot = await firestore.collection(`tenants/${tenantId}/payments`)
            .where('cashRegisterId', '==', cashRegisterId)
            .where('status', '==', 'completed')
            .get();
        if (paymentsSnapshot.empty) {
            // No payments, just close the register
            await registerRef.update({
                status: 'closed',
                closedAt: admin.firestore.FieldValue.serverTimestamp(),
                closingBalance: registerData.openingBalance,
                totalSales: 0,
                totalCashSales: 0,
            });
            return { success: true, message: 'Session closed. No transactions were made.' };
        }
        // 2. Calculate totals
        let totalSales = 0;
        let totalCashSales = 0;
        const paymentMethodBreakdown = {};
        paymentsSnapshot.forEach(doc => {
            const payment = doc.data();
            totalSales += payment.amount || 0;
            if (payment.method === 'cash') {
                totalCashSales += payment.amount || 0;
            }
            if (paymentMethodBreakdown[payment.method]) {
                paymentMethodBreakdown[payment.method].count++;
                paymentMethodBreakdown[payment.method].total += payment.amount || 0;
            }
            else {
                paymentMethodBreakdown[payment.method] = { count: 1, total: payment.amount || 0 };
            }
        });
        const closingBalance = (registerData.openingBalance || 0) + totalCashSales;
        // 3. Update the cash register document
        await registerRef.update({
            status: 'closed',
            closedAt: admin.firestore.FieldValue.serverTimestamp(),
            closedBy: uid,
            totalSales,
            totalCashSales,
            paymentMethodBreakdown,
            closingBalance,
        });
        // 4. (STUB) Generate and store the report
        const reportData = {
            cashRegisterId,
            ...registerData,
            closedBy: uid,
            totalSales,
            totalCashSales,
            paymentMethodBreakdown,
            closingBalance,
        };
        await firestore.collection(`tenants/${tenantId}/reports`).add({
            type: 'z-report',
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            data: reportData,
            fileUrl: null,
        });
        return { success: true, message: 'Z-Report generated successfully.' };
    }
    catch (error) {
        console.error('Error generating Z-Report:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'An unexpected error occurred.', error?.message || String(error));
    }
});
//# sourceMappingURL=generateZReport.js.map