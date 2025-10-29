
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as xmlbuilder from "xmlbuilder";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * 🇩🇪 Erzeugt einen RKSV/FinanzOnline-kompatiblen DEP-Export (XML).
 * 🇬🇧 Generates a FinanzOnline-compliant DEP export (XML format).
 */
export const createFinanzOnlineExport = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    const { tenantId } = data;

    if (!tenantId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing tenantId");
    }

    const db = admin.firestore();

    const tenantDoc = await db.doc(`tenants/${tenantId}`).get();
    if (!tenantDoc.exists) {
      throw new functions.https.HttpsError("not-found", `Tenant ${tenantId} not found`);
    }

    const tenantData = tenantDoc.data();
    const { cashRegisterId, certSerialNumber } = tenantData?.rksv || {};

    if (!cashRegisterId || !certSerialNumber) {
      throw new functions.https.HttpsError(
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
    const dep = xmlbuilder
      .create("Datenerfassungsprotokoll", { encoding: "UTF-8" })
      .att("xmlns", "http://finanzonline.bmf.gv.at/rksv/dep");

    const header = dep.ele("Header");
    header.ele("KassenID", cashRegisterId);
    header.ele("ZertifikatSeriennummer", certSerialNumber);
    header.ele("ExportDatum", new Date().toISOString());

    const sigChain = dep.ele("Signaturkette");
    chainSnap.forEach((doc) => {
      const d = doc.data();
      const entry = sigChain.ele("Beleg");
      entry.ele("Datum", d.createdAt.toDate().toISOString());
      entry.ele("Betrag", d.totalAmount.toFixed(2));
      entry.ele("Hash", d.hash);
      entry.ele("Signatur", d.signature);
      entry.ele("VorherigeSignatur", d.previousSignature);
    });

    const reports = dep.ele("ZBerichte");
    zReportsSnap.forEach((doc) => {
      const r = doc.data();
      const entry = reports.ele("ZBericht");
      entry.ele("Datum", r.date.toDate().toISOString());
      entry.ele("Umsatz", r.totalSales.toFixed(2));
      entry.ele("Transaktionen", r.transactionCount);
      entry.ele("Hash", r.hash);
      entry.ele("Signatur", r.signature);
    });

    // === XML generieren ===
    const xmlContent = dep.end({ pretty: true });

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
