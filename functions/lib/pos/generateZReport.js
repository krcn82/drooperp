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
const i18n_1 = require("../i18n");
// 🕒 Täglicher Zeitplan: Jeden Tag um 23:00 Uhr (Wiener Zeit)
const scheduleOptions = {
    schedule: "0 23 * * *",
    timeZone: "Europe/Vienna",
};
/**
 * 🇩🇪 Funktion: Generiert den täglichen RKSV-konformen Tagesabschluss (Z-Bericht)
 * 🇬🇧 Function: Generates the daily RKSV-compliant Z-Report
 */
exports.generateZReport = (0, scheduler_1.onSchedule)(scheduleOptions, async (event) => {
    const db = admin.firestore();
    console.info((0, i18n_1.t)("de", "DAILY_REPORT_STARTED"));
    const tenantsSnap = await db.collection("tenants").get();
    for (const tenant of tenantsSnap.docs) {
        const tenantId = tenant.id;
        const transactionsRef = db.collection(`tenants/${tenantId}/transactions`);
        const zReportsRef = db.collection(`tenants/${tenantId}/zReports`);
        // 📅 Zeitraum für den heutigen Tag
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const transactionsSnap = await transactionsRef
            .where("createdAt", ">=", startOfDay)
            .where("createdAt", "<=", endOfDay)
            .get();
        if (transactionsSnap.empty) {
            console.info(`${(0, i18n_1.t)("de", "NO_TRANSACTIONS")} (${tenantId})`);
            continue;
        }
        // 💰 Gesamtsumme berechnen
        let totalAmount = 0;
        transactionsSnap.forEach((doc) => {
            totalAmount += doc.data().totalAmount || 0;
        });
        // 🔐 RKSV-Signatur und Hash erzeugen
        const summaryData = {
            date: startOfDay.toISOString().split("T")[0],
            totalTransactions: transactionsSnap.size,
            totalAmount,
        };
        const { currentHash, signature } = await (0, rksvSignature_1.generateRKSVSignature)(tenantId, summaryData);
        // 🧾 Tagesabschluss speichern
        await zReportsRef.add({
            ...summaryData,
            rksvHash: currentHash,
            rksvSignature: signature,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.info(`✅ ${(0, i18n_1.t)("de", "DAILY_REPORT_COMPLETED")} [${tenantId}]`);
    }
    console.info("🎯 Alle Z-Berichte erfolgreich erstellt und signiert.");
});
//# sourceMappingURL=generateZReport.js.map