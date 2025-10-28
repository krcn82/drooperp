import * as admin from "firebase-admin";
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

  // 📅 Zeitraum (heutiger Tag)
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const transactionsSnap = await transactionsRef
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

  if (transactionsSnap.empty) {
    console.log(`Keine Transaktionen für ${tenantId} gefunden.`);
    return;
  }

  // 💶 Tagesumsatz berechnen
  let total = 0;
  transactionsSnap.forEach((t) => {
    total += t.data().totalAmount || 0;
  });

  const reportData = {
    date: start.toISOString().split("T")[0],
    totalTransactions: transactionsSnap.size,
    totalAmount: total,
  };

  // 🔐 RKSV-Signatur
  const { currentHash, signature } = await generateRKSVSignature(tenantId, reportData);

  // 🧾 Z-Bericht speichern
  await zReportsRef.add({
    ...reportData,
    rksvHash: currentHash,
    rksvSignature: signature,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ Tagesabschluss für ${tenantId} abgeschlossen.`);
}
