
import * as admin from "firebase-admin";
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { AnyData } from '../types';
import { create } from 'xmlbuilder2';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * 🇩🇪 Erzeugt einen RKSV/FinanzOnline-kompatiblen DEP-Export (XML).
 * 🇬🇧 Generates a FinanzOnline-compliant DEP export (XML format).
 */
export const createFinanzOnlineExport = onCall({ region: 'us-central1' }, async (request: CallableRequest<AnyData>) => {
    const { tenantId } = request.data as { tenantId?: string };

    if (!tenantId) {
      throw new HttpsError("invalid-argument", "Missing tenantId");
    }

    const db = admin.firestore();

    const tenantDoc = await db.doc(`tenants/${tenantId}`).get();
    if (!tenantDoc.exists) {
      throw new HttpsError("not-found", `Tenant ${tenantId} not found`);
    }

    const tenantData = tenantDoc.data();
    const { cashRegisterId, certSerialNumber } = tenantData?.rksv || {};

    if (!cashRegisterId || !certSerialNumber) {
      throw new HttpsError(
        "failed-precondition",
        "RKSV credentials missing."
      );
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
    const dep = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('Datenerfassungsprotokoll')
      .att('xmlns', 'http://finanzonline.bmf.gv.at/rksv/dep');

    const header = dep.ele('Header');
    header.ele('KassenID').txt(String(cashRegisterId));
    header.ele('ZertifikatSeriennummer').txt(String(certSerialNumber));
    header.ele('ExportDatum').txt(new Date().toISOString());

    const sigChain = dep.ele('Signaturkette');
    chainSnap.forEach((doc) => {
      const d = doc.data() as any;
      const entry = sigChain.ele('Beleg');
      entry.ele('Datum').txt(d.createdAt.toDate().toISOString());
      entry.ele('Betrag').txt((d.totalAmount || 0).toFixed(2));
      entry.ele('Hash').txt(d.hash);
      entry.ele('Signatur').txt(d.signature);
      entry.ele('VorherigeSignatur').txt(d.previousSignature);
    });

    const reports = dep.ele('ZBerichte');
    zReportsSnap.forEach((doc) => {
      const r = doc.data() as any;
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
