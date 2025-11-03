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
exports.closeDay = closeDay;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const rksvSignature_1 = require("./rksvSignature");
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * 🇩🇪 Führt den täglichen RKSV-konformen Tagesabschluss durch.
 * 🇬🇧 Executes the daily RKSV-compliant end-of-day closing.
 */
async function closeDay(tenantId) {
    const db = admin.firestore();
    const transactionsRef = db.collection(`tenants/${tenantId}/transactions`);
    const zReportsRef = db.collection(`tenants/${tenantId}/zReports`);
    const rksvChainRef = db.collection(`tenants/${tenantId}/rksvChain`);
    // Zeitraum: heutiger Tag (0:00 - 23:59)
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    // Hole alle Transaktionen des Tages
    const transactionsSnap = await transactionsRef
        .where("createdAt", ">=", start)
        .where("createdAt", "<=", end)
        .get();
    if (transactionsSnap.empty) {
        console.log(`Keine Transaktionen für ${tenantId} gefunden.`);
        return;
    }
    // Tagesumsatz berechnen
    let total = 0;
    transactionsSnap.forEach((t) => {
        total += t.data().totalAmount || 0;
    });
    // Get the last signature from the chain for continuity
    const lastChainLinkSnap = await rksvChainRef.orderBy("createdAt", "desc").limit(1).get();
    const previousSignature = lastChainLinkSnap.empty ? "INITIAL_SIGNATURE" : lastChainLinkSnap.docs[0].data().signature;
    // The closeDay transaction object for signing
    const closeDayTransaction = {
        isZReport: true,
        totalAmount: total,
        transactionCount: transactionsSnap.size,
        reportDate: new Date().toISOString(),
    };
    // RKSV-konforme neue Signatur erzeugen
    const { signature, hash } = await (0, rksvSignature_1.generateRKSVSignature)(tenantId, closeDayTransaction, previousSignature);
    // Z-Bericht-Dokument speichern
    const zReportData = {
        tenantId,
        date: admin.firestore.Timestamp.now(),
        totalSales: total,
        transactionCount: transactionsSnap.size,
        signature,
        hash,
        status: "finalized",
    };
    await zReportsRef.add(zReportData);
    console.log(`Z-Bericht für ${tenantId} erfolgreich erstellt.`);
}
/**
 * Cloud Function: Automatischer Tagesabschluss (jeden Tag um 23:59)
 * Cloud Function: Automatic end-of-day closing (every day at 23:59)
 */
exports.generateZReport = (0, scheduler_1.onSchedule)({ schedule: '59 23 * * *', timeZone: 'Europe/Vienna' }, async () => {
    const db = admin.firestore();
    const tenantsSnap = await db.collection("tenants").get();
    for (const tenantDoc of tenantsSnap.docs) {
        const tenantId = tenantDoc.id;
        try {
            await closeDay(tenantId);
        }
        catch (error) {
            console.error(`Fehler beim Z-Bericht für ${tenantId}:`, error);
        }
    }
});
//# sourceMappingURL=closeDay.js.map