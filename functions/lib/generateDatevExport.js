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
exports.generateDatevExport = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
/**
 * Generates a DATEV-compatible CSV string from a tenant's transactions.
 */
exports.generateDatevExport = (0, https_1.onCall)(async (request) => {
    const { tenantId } = request.data;
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (!tenantId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required data: tenantId.');
    }
    const firestore = admin.firestore();
    // Admin Check: Verify the user has the 'admin' role for this tenant.
    const userDoc = await firestore.doc(`tenants/${tenantId}/users/${uid}`).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'You must be an admin to generate a DATEV export.');
    }
    const transactionsSnapshot = await firestore.collection(`tenants/${tenantId}/transactions`).get();
    if (transactionsSnapshot.empty) {
        return { csv: '', message: 'No transactions found for the given period.' };
    }
    // NOTE: This is a simplified DATEV format. The official format is highly complex and specific.
    // This header matches the user's request.
    let csvContent = 'Date,TransactionID,AccountNumber,Amount,PaymentMethod,Description\n';
    transactionsSnapshot.forEach(doc => {
        const tx = doc.data();
        // Format date to DD.MM.YYYY
        const date = tx.timestamp.toDate().toLocaleDateString('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const transactionId = doc.id;
        const accountNumber = '8400'; // Example account for revenue
        const amount = tx.amountTotal.toFixed(2).replace('.', ','); // German decimal format
        const paymentMethod = tx.paymentMethod;
        const description = tx.items.map(item => `${item.qty}x ${item.name}`).join(', ');
        csvContent += `"${date}","${transactionId}","${accountNumber}","${amount}","${paymentMethod}","${description}"\n`;
    });
    return { csv: csvContent, message: 'Export generated successfully.' };
});
//# sourceMappingURL=generateDatevExport.js.map