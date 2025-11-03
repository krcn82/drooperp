import * as admin from "firebase-admin";
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { generateRKSVSignature } from "./rksvSignature";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * 🇩🇪 Führt den täglichen RKSV-konformen Tagesabschluss durch.
 * 🇬🇧 Executes the daily RKSV-compliant end-of-day closing.
 */
export async function closeDay(tenantId: string): Promise<void> {
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
  const { signature, hash } = await generateRKSVSignature(
    tenantId,
    closeDayTransaction,
    previousSignature
  );

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
export const generateZReport = onSchedule({ schedule: '59 23 * * *', timeZone: 'Europe/Vienna' }, async () => {
    const db = admin.firestore();
    const tenantsSnap = await db.collection("tenants").get();

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      try {
        await closeDay(tenantId);
      } catch (error) {
        console.error(`Fehler beim Z-Bericht für ${tenantId}:`, error);
      }
    }

  });
