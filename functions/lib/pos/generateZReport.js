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
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const rksvSignature_1 = require("./rksvSignature");
exports.generateZReport = (0, scheduler_1.onSchedule)({
    schedule: "0 23 * * *",
    timeZone: "Europe/Vienna",
}, async (event) => {
    const db = admin.firestore();
    const tenantsSnap = await db.collection("tenants").get();
    for (const tenant of tenantsSnap.docs) {
        const tenantId = tenant.id;
        const transactionsRef = db.collection(`tenants/${tenantId}/transactions`);
        const zReportsRef = db.collection(`tenants/${tenantId}/zReports`);
        // 📦 Get transactions for the day
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const transactionsSnap = await transactionsRef
            .where("createdAt", ">=", startOfDay)
            .where("createdAt", "<=", endOfDay)
            .get();
        if (transactionsSnap.empty) {
            console.info(`No transactions found for ${tenantId} on ${startOfDay.toDateString()}`);
            continue;
        }
        // 💰 Calculate total amount
        let totalAmount = 0;
        transactionsSnap.forEach((doc) => {
            totalAmount += doc.data().totalAmount || 0;
        });
        // 🔐 Create end-of-day summary hash
        const summaryData = {
            date: startOfDay.toISOString().split("T")[0],
            totalTransactions: transactionsSnap.size,
            totalAmount,
        };
        const { currentHash, signature } = await (0, rksvSignature_1.generateRKSVSignature)(tenantId, summaryData);
        // 🧾 Save to Firestore
        await zReportsRef.add({
            ...summaryData,
            rksvHash: currentHash,
            rksvSignature: signature,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.info(`✅ Z-Report generated for tenant ${tenantId} (${transactionsSnap.size} transactions)`);
    }
    console.info("🎯 Daily RKSV Z-Reports successfully generated.");
    return null;
});
//# sourceMappingURL=generateZReport.js.map