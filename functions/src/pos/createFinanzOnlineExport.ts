import * as admin from "firebase-admin";
import * as xmlbuilder from "xmlbuilder2";
import { onCall, HttpsError } from "firebase-functions/v2/https";

/**
 * 🇩🇪 Erstellt eine FinanzOnline-konforme RKSV-DEP-Export-Datei (XML).
 * 🇬🇧 Creates a FinanzOnline-compliant RKSV DEP export file (XML).
 */
export const createFinanzOnlineExport = onCall(async (request) => {
    const { tenantId, date } = request.data; // e.g., date = "2025-10-28"
    const uid = request.auth?.uid;

    if (!uid) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (!tenantId || !date) {
        throw new HttpsError('invalid-argument', 'tenantId and date are required.');
    }

    const db = admin.firestore();
    const zReportRef = db.collection(`tenants/${tenantId}/zReports`);
    const transactionsRef = db.collection(`tenants/${tenantId}/transactions`);
    const kassenId = (await db.doc(`tenants/${tenantId}/rksvConfig`).get()).data()?.kassenId;

    // 📅 Aktuellen Tagesabschluss abrufen
    const zReportSnap = await zReportRef.where("date", "==", date).limit(1).get();
    if (zReportSnap.empty) {
        throw new HttpsError('not-found', `Kein Z-Bericht für ${date} gefunden.`);
    }
    const zReport = zReportSnap.docs[0].data();

    // 💾 Transaktionen des Tages abrufen
    const start = new Date(`${date}T00:00:00Z`);
    const end = new Date(`${date}T23:59:59Z`);
    const transactionsSnap = await transactionsRef
        .where("createdAt", ">=", start)
        .where("createdAt", "<=", end)
        .get();

    // 🧾 DEP XML-Struktur aufbauen
    const root = xmlbuilder.create({ version: "1.0", encoding: "UTF-8" }).ele("DataCollection");

    root.ele("Header", {
        KassenId: kassenId || "UNKNOWN",
        Datum: zReport.date,
        Anzahl_Transaktionen: transactionsSnap.size,
        Betrag_Brutto: zReport.totalAmount.toFixed(2),
        Signatur: zReport.rksvSignature,
    });

    const txList = root.ele("Transactions");

    transactionsSnap.forEach((doc) => {
        const t = doc.data();
        txList.ele("Transaction", {
            id: doc.id,
            Belegnummer: doc.id,
            Timestamp: t.createdAt?.toDate().toISOString() || "",
            Betrag_Brutto: t.totalAmount?.toFixed(2) || 0,
            Signatur: t.rksvSignature || "",
            Hash: t.rksvHash || "",
        });
    });

    const xmlString = root.end({ prettyPrint: true });

    // 📁 Speichern in Storage
    const bucket = admin.storage().bucket();
    const fileName = `exports/${tenantId}/DEP-${date}.xml`;
    const file = bucket.file(fileName);
    
    await file.save(xmlString, {
      metadata: { contentType: "application/xml" },
    });

    // 🔗 Rückgabe (Download-URL)
    const [url] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    return { success: true, downloadUrl: url };
});
