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
exports.submitDEPToFinanzOnline = submitDEPToFinanzOnline;
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const logFinanzOnline_1 = require("./logFinanzOnline");
const error_logging_1 = require("../lib/error-logging");
if (!admin.apps.length)
    admin.initializeApp();
/**
 * 🇩🇪 Sendet den DEP-Export automatisch an das FinanzOnline-System.
 * 🇬🇧 Automatically submits the DEP export file to FinanzOnline.
 */
async function submitDEPToFinanzOnline(tenantId, date) {
    const db = admin.firestore();
    try {
        const configSnap = await db.collection(`tenants/${tenantId}/rksvConfig`).limit(1).get();
        if (configSnap.empty)
            throw new Error("Keine RKSV-Konfiguration gefunden.");
        const config = configSnap.docs[0].data();
        const storage = admin.storage().bucket();
        const fileName = `exports/${tenantId}/DEP-${date}.xml`;
        const file = storage.file(fileName);
        const [exists] = await file.exists();
        if (!exists) {
            throw new Error(`Kein DEP-Export für ${date} in Storage gefunden. Bitte zuerst generieren.`);
        }
        const [xmlBuffer] = await file.download();
        const xmlString = xmlBuffer.toString("utf-8");
        const endpoint = config.useSandbox
            ? "https://test.finanzonline.bmf.gv.at/fonws/ws/"
            : "https://finanzonline.bmf.gv.at/fonws/ws/";
        const body = {
            TeilnehmerId: config.finanzOnlineSubId,
            BenutzerId: config.finanzOnlineUser,
            Passwort: config.finanzOnlinePassword, // Note: This should be a secret!
            DEP: xmlString,
            Typ: "RKSV-DEP-EXPORT",
            Datum: date,
        };
        const response = await (0, node_fetch_1.default)(endpoint + "rkws/depUpload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const result = await response.text();
        await (0, logFinanzOnline_1.logFinanzOnlineTransmission)(tenantId, date, response.ok ? "success" : "failed", result);
        console.log(`📤 DEP-Export von ${tenantId} → FinanzOnline gesendet.`);
        return { status: response.ok ? "success" : "failed", result };
    }
    catch (err) {
        console.error(`❌ Fehler bei der Übertragung an FinanzOnline für ${tenantId}:`, err);
        await (0, error_logging_1.logError)(tenantId, "submitDEPToFinanzOnline", err.message || "unknown error", "critical");
        // Re-throw the error so the caller knows the submission failed
        throw err;
    }
}
//# sourceMappingURL=submitFinanzOnline.js.map