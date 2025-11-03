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
exports.logFinanzOnlineTransmission = logFinanzOnlineTransmission;
const admin = __importStar(require("firebase-admin"));
const error_logging_1 = require("../lib/error-logging");
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * 🇩🇪 Protokolliert jede FinanzOnline-Übertragung.
 * 🇬🇧 Logs each FinanzOnline transmission for auditing and compliance.
 */
async function logFinanzOnlineTransmission(tenantId, date, status, response) {
    const db = admin.firestore();
    try {
        await db.collection(`tenants/${tenantId}/finanzOnlineLogs`).add({
            date,
            status,
            result: response, // Align with the data model which uses 'result'
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.info(`📘 FinanzOnline-Log gespeichert für ${tenantId} (${status})`);
    }
    catch (err) {
        await (0, error_logging_1.logError)(tenantId, "logFinanzOnlineTransmission", err.message || "unknown error");
    }
}
//# sourceMappingURL=logFinanzOnline.js.map