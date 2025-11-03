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
exports.createFinanzOnlineExport = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const xmlbuilder2_1 = require("xmlbuilder2");
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * 🇩🇪 Erzeugt einen RKSV/FinanzOnline-kompatiblen DEP-Export (XML).
 * 🇬🇧 Generates a FinanzOnline-compliant DEP export (XML format).
 */
exports.createFinanzOnlineExport = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const { tenantId } = request.data;
    if (!tenantId) {
        throw new https_1.HttpsError("invalid-argument", "Missing tenantId");
    }
    const db = admin.firestore();
    const tenantDoc = await db.doc(`tenants/${tenantId}`).get();
    if (!tenantDoc.exists) {
        throw new https_1.HttpsError("not-found", `Tenant ${tenantId} not found`);
    }
    const tenantData = tenantDoc.data();
    const { cashRegisterId, certSerialNumber } = tenantData?.rksv || {};
    if (!cashRegisterId || !certSerialNumber) {
        throw new https_1.HttpsError("failed-precondition", "RKSV credentials missing.");
    }
    // 🔹 Hole alle Signatur-Einträge
    const chainSnap = await db
        .collection(`tenants/${tenantId}/rksvChain`)
        .orderBy("createdAt")
        .get();
    // 🔹 Hole alle Z-Berichte
    const zReportsSnap = await db
        .collection(`tenants/${tenantId}/zReports`)
        .orderBy("date")
        .get();
    // === XML Aufbau ===
    const dep = (0, xmlbuilder2_1.create)({ version: '1.0', encoding: 'UTF-8' })
        .ele('Datenerfassungsprotokoll')
        .att('xmlns', 'http://finanzonline.bmf.gv.at/rksv/dep');
    const header = dep.ele('Header');
    header.ele('KassenID').txt(String(cashRegisterId));
    header.ele('ZertifikatSeriennummer').txt(String(certSerialNumber));
    header.ele('ExportDatum').txt(new Date().toISOString());
    const sigChain = dep.ele('Signaturkette');
    chainSnap.forEach((doc) => {
        const d = doc.data();
        const entry = sigChain.ele('Beleg');
        entry.ele('Datum').txt(d.createdAt.toDate().toISOString());
        entry.ele('Betrag').txt((d.totalAmount || 0).toFixed(2));
        entry.ele('Hash').txt(d.hash);
        entry.ele('Signatur').txt(d.signature);
        entry.ele('VorherigeSignatur').txt(d.previousSignature);
    });
    const reports = dep.ele('ZBerichte');
    zReportsSnap.forEach((doc) => {
        const r = doc.data();
        const entry = reports.ele('ZBericht');
        entry.ele('Datum').txt(r.date.toDate().toISOString());
        entry.ele('Umsatz').txt((r.totalSales || 0).toFixed(2));
        entry.ele('Transaktionen').txt(String(r.transactionCount || 0));
        entry.ele('Hash').txt(r.hash);
        entry.ele('Signatur').txt(r.signature);
    });
    // === XML generieren ===
    const xmlContent = dep.end({ prettyPrint: true });
    // === Temporäre Datei speichern ===
    const filePath = path.join(os.tmpdir(), `${tenantId}-DEP.xml`);
    fs.writeFileSync(filePath, xmlContent);
    console.log(`DEP Export für ${tenantId} erstellt: ${filePath}`);
    // === Optional: Hochladen in Cloud Storage ===
    const bucket = admin.storage().bucket();
    const destination = `exports/${tenantId}/DEP-${Date.now()}.xml`;
    await bucket.upload(filePath, { destination });
    return {
        message: `DEP Export erfolgreich für ${tenantId}`,
        storagePath: destination,
    };
});
//# sourceMappingURL=createFinanzOnlineExport.js.map