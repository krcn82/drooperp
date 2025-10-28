import * as admin from "firebase-admin";
import { onSchedule, ScheduleOptions, ScheduledEvent } from "firebase-functions/v2/scheduler";
import { generateRKSVSignature } from "./rksvSignature";
import { t } from "../i18n";

// 🕒 Täglicher Zeitplan: Jeden Tag um 23:00 Uhr (Wiener Zeit)
const scheduleOptions: ScheduleOptions = {
  schedule: "0 23 * * *",
  timeZone: "Europe/Vienna",
};

/**
 * 🇩🇪 Funktion: Generiert den täglichen RKSV-konformen Tagesabschluss (Z-Bericht)
 * 🇬🇧 Function: Generates the daily RKSV-compliant Z-Report
 */
export const generateZReport = onSchedule(scheduleOptions, async (event: ScheduledEvent): Promise<void> => {
  const db = admin.firestore();
  console.info(t("de", "DAILY_REPORT_STARTED"));

  const tenantsSnap = await db.collection("tenants").get();

  for (const tenant of tenantsSnap.docs) {
    const tenantId = tenant.id;
    const transactionsRef = db.collection(`tenants/${tenantId}/transactions`);
    const zReportsRef = db.collection(`tenants/${tenantId}/zReports`);

    // 📅 Zeitraum für den heutigen Tag
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const transactionsSnap = await transactionsRef
      .where("createdAt", ">=", startOfDay)
      .where("createdAt", "<=", endOfDay)
      .get();

    if (transactionsSnap.empty) {
      console.info(`${t("de", "NO_TRANSACTIONS")} (${tenantId})`);
      continue;
    }

    // 💰 Gesamtsumme berechnen
    let totalAmount = 0;
    transactionsSnap.forEach((doc) => {
      totalAmount += doc.data().totalAmount || 0;
    });

    // 🔐 RKSV-Signatur und Hash erzeugen
    const summaryData = {
      date: startOfDay.toISOString().split("T")[0],
      totalTransactions: transactionsSnap.size,
      totalAmount,
    };

    const { currentHash, signature } = await generateRKSVSignature(tenantId, summaryData);

    // 🧾 Tagesabschluss speichern
    await zReportsRef.add({
      ...summaryData,
      rksvHash: currentHash,
      rksvSignature: signature,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.info(`✅ ${t("de", "DAILY_REPORT_COMPLETED")} [${tenantId}]`);
  }

  console.info("🎯 Alle Z-Berichte erfolgreich erstellt und signiert.");
});
