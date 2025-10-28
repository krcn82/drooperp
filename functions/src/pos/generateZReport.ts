
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { generateRKSVSignature } from "./rksvSignature";

export const generateZReport = onSchedule(
  {
    schedule: "0 23 * * *",
    timeZone: "Europe/Vienna",
  },
  async (event) => {
    const db = admin.firestore();
    const tenantsSnap = await db.collection("tenants").get();

    for (const tenant of tenantsSnap.docs) {
      const tenantId = tenant.id;
      const transactionsRef = db.collection(`tenants/${tenantId}/transactions`);
      const zReportsRef = db.collection(`tenants/${tenantId}/zReports`);

      // 📦 Get transactions for the day
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const transactionsSnap = await transactionsRef
        .where("createdAt", ">=", startOfDay)
        .where("createdAt", "<=", endOfDay)
        .get();

      if (transactionsSnap.empty) {
        console.info(`No transactions found for ${tenantId} on ${startOfDay.toDateString()}`);
        continue;
      }

      // 💰 Calculate total amount
      let totalAmount = 0;
      transactionsSnap.forEach((doc) => {
        totalAmount += doc.data().totalAmount || 0;
      });

      // 🔐 Create end-of-day summary hash
      const summaryData = {
        date: startOfDay.toISOString().split("T")[0],
        totalTransactions: transactionsSnap.size,
        totalAmount,
      };

      const { currentHash, signature } = await generateRKSVSignature(tenantId, summaryData);

      // 🧾 Save to Firestore
      await zReportsRef.add({
        ...summaryData,
        rksvHash: currentHash,
        rksvSignature: signature,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.info(`✅ Z-Report generated for tenant ${tenantId} (${transactionsSnap.size} transactions)`);
    }

    console.info("🎯 Daily RKSV Z-Reports successfully generated.");
    return null;
  }
);
