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
exports.generateRKSVSignature = generateRKSVSignature;
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
/**
 * 🇩🇪 Erzeugt eine RKSV-konforme Signatur für eine Transaktion oder den Tagesabschluss.
 * 🇬🇧 Generates an RKSV-compliant signature for a transaction or daily closing (Z-Report).
 *
 * 🔐 Anforderungen laut RKSV:
 * - Jede Transaktion muss mit der vorherigen verknüpft sein (Hash-Kette)
 * - Der Signaturwert basiert auf:
 *    {Kassen-ID, Belegnummer, Datum, Betrag, vorherige Signatur}
 */
async function generateRKSVSignature(tenantId, dataToSign, // Generic object for flexibility
previousSignature) {
    const db = admin.firestore();
    // Hole Tenant-Konfiguration (enthält Kassen-ID und Zertifikatsdaten)
    const tenantDoc = await db.doc(`tenants/${tenantId}`).get();
    const tenantData = tenantDoc.data();
    if (!tenantData) {
        throw new Error(`Tenant ${tenantId} not found`);
    }
    const { cashRegisterId, certPrivateKey, certSerialNumber } = tenantData.rksv || {};
    if (!certPrivateKey || !cashRegisterId) {
        throw new Error(`RKSV credentials missing for tenant ${tenantId}. Please configure certificate.`);
    }
    // === HASH-KETTE AUFBAU ===
    const dataToHash = `${cashRegisterId}|${JSON.stringify(dataToSign)}|${previousSignature}`;
    const hash = crypto.createHash("sha256").update(dataToHash).digest("base64");
    // === DIGITALE SIGNATUR (RSA-SHA256) ===
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(hash);
    const signature = signer.sign(certPrivateKey, "base64");
    // Speichere Signatur-Kette zur späteren DEP-Erstellung
    const chainRef = db.collection(`tenants/${tenantId}/rksvChain`).doc();
    await chainRef.set({
        createdAt: admin.firestore.Timestamp.now(),
        cashRegisterId,
        certSerialNumber: certSerialNumber || "UNKNOWN",
        hash,
        signature,
        previousSignature,
    });
    return { signature, hash };
}
//# sourceMappingURL=rksvSignature.js.map