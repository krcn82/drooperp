"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signWithRKSVProvider = signWithRKSVProvider;
const error_logging_1 = require("../lib/error-logging");
const rksv_utils_1 = require("./rksv-utils");
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * 🇩🇪 Abstrakte Signaturfunktion für RKSV-konforme Kassen.
 * 🇬🇧 Abstract signature provider for RKSV-compliant cash registers.
 *
 * Unterstützt:
 *  - A-Trust Online (Cloud-Signatur)
 *  - USB/SmartCard (zukünftige Erweiterung)
 */
async function signWithRKSVProvider(tenantId, dataToSign) {
    try {
        const creds = await (0, rksv_utils_1.getRKSVConfig)(tenantId);
        const { signatureType, aTrustUser, aTrustPassword } = creds;
        if (signatureType === "atrust_online") {
            if (!aTrustUser || !aTrustPassword) {
                throw new Error("A-Trust credentials are not configured for this tenant.");
            }
            return await signWithATrustOnline(dataToSign, aTrustUser, aTrustPassword);
        }
        else if (signatureType === "usb") {
            // Zukunft: lokale Signaturstation oder Middleware
            throw new Error("Lokale Signaturgeräte noch nicht implementiert.");
        }
        else {
            throw new Error(`Unbekannter Signaturtyp: ${signatureType}`);
        }
    }
    catch (err) {
        await (0, error_logging_1.logError)(tenantId, "signWithRKSVProvider", err.message || "Signaturfehler", "critical");
        throw new Error("Fehler bei der Signaturerstellung.");
    }
}
/**
 * 🇩🇪 Signiert Daten mit dem A-Trust Online Service.
 * 🇬🇧 Signs data using the A-Trust Online cloud service.
 */
async function signWithATrustOnline(dataToSign, username, password) {
    const response = await (0, node_fetch_1.default)("https://mobile.a-trust.at/asignrkonline/v2/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username,
            password, // Should be retrieved from a secret manager
            dataToBeSigned: Buffer.from(dataToSign).toString("base64"),
        }),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`A-Trust API Fehler: ${response.status} - ${text}`);
    }
    const result = await response.json();
    return result.signature; // base64 encoded signature
}
//# sourceMappingURL=rksvProvider.js.map