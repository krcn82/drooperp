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
exports.generateReport = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const date_fns_1 = require("date-fns");
exports.generateReport = (0, https_1.onCall)(async (request) => {
    const { tenantId, range } = request.data;
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (!tenantId || !range) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required data: tenantId or range.');
    }
    const firestore = admin.firestore();
    // Admin Check: Verify the user has the 'admin' role for this tenant.
    const userDoc = await firestore.doc(`tenants/${tenantId}/users/${uid}`).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'You must be an admin to generate reports.');
    }
    // Determine date range
    const now = new Date();
    let startDate;
    switch (range) {
        case 'today':
            startDate = (0, date_fns_1.startOfDay)(now);
            break;
        case 'last7days':
            startDate = (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(now, 7));
            break;
        case 'last30days':
        default:
            startDate = (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(now, 30));
            break;
    }
    const transactionsSnapshot = await firestore
        .collection(`tenants/${tenantId}/transactions`)
        .where('timestamp', '>=', startDate)
        .get();
    if (transactionsSnapshot.empty) {
        return {
            totalRevenue: 0,
            totalTransactions: 0,
            avgTicketSize: 0,
            chartData: [],
            topProducts: [],
        };
    }
    const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.amountTotal || 0), 0);
    const totalTransactions = transactions.length;
    const avgTicketSize = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const dailyRevenue = {};
    transactions.forEach(tx => {
        if (tx.timestamp) {
            const dateStr = tx.timestamp.toDate().toISOString().split('T')[0]; // YYYY-MM-DD
            dailyRevenue[dateStr] = (dailyRevenue[dateStr] || 0) + (tx.amountTotal || 0);
        }
    });
    const chartData = Object.keys(dailyRevenue).map(date => ({
        date: date,
        revenue: dailyRevenue[date],
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const productSales = new Map();
    transactions.forEach(tx => {
        if (Array.isArray(tx.items)) {
            tx.items.forEach(item => {
                const id = item.productId || item.name;
                const quantity = item.qty || 0;
                const price = item.price || 0;
                if (!id || !quantity)
                    return;
                const existing = productSales.get(id);
                if (existing) {
                    existing.quantity += quantity;
                    existing.revenue += price * quantity;
                }
                else {
                    productSales.set(id, { name: item.name, quantity: quantity, revenue: price * quantity });
                }
            });
        }
    });
    const topProducts = Array.from(productSales.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
    const report = {
        totalRevenue,
        totalTransactions,
        avgTicketSize,
        chartData,
        topProducts,
    };
    // Store report in Firestore
    const reportId = `${range}_${new Date().toISOString()}`;
    await firestore.collection(`tenants/${tenantId}/reports`).doc(reportId).set({
        ...report,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        generatedBy: uid,
    });
    // TODO: Add logic to prune old reports to keep only the last 3
    return report;
});
//# sourceMappingURL=generateReport.js.map