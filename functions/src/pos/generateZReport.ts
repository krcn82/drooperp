
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { generateRKSVSignature } from "./rksvSignature";
import { t, Language } from "../i18n";

export const generateZReport = onSchedule({
    schedule: "0 23 * * *",
    timeZone: "Europe/Vienna",
}, async (event) => {
    console.info("Daily RKSV Z-Reports process started...");
    const db = admin.firestore();
    const tenantsSnap = await db.collection("tenants").get();

    for (const tenant of tenantsSnap.docs) {
        const tenantId = tenant.id;
        
        // Fetch tenant language preference, default to 'en'
        const settingsDoc = await db.doc(`tenants/${tenantId}/settings/general`).get();
        const lang = (settingsDoc.data()?.lang || 'en') as Language;
        
        console.info(`[${lang.toUpperCase()}] ${t(lang, "DAILY_REPORT_STARTED")} Tenant: ${tenantId}`);

        const transactionsRef = db.collection(`tenants/${tenantId}/transactions`);
        const zReportsRef = db.collection(`tenants/${tenantId}/zReports`);

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const transactionsSnap = await transactionsRef
            .where("createdAt", ">=", startOfDay)
            .where("createdAt", "<=", endOfDay)
            .get();

        if (transactionsSnap.empty) {
            console.info(`[${lang.toUpperCase()}] ${t(lang, "NO_TRANSACTIONS")} Tenant: ${tenantId}, Date: ${startOfDay.toDateString()}`);
            continue;
        }

        let totalAmount = 0;
        transactionsSnap.forEach((doc) => {
            totalAmount += doc.data().totalAmount || 0;
        });

        const summaryData = {
            date: startOfDay.toISOString().split("T")[0],
            totalTransactions: transactionsSnap.size,
            totalAmount,
        };

        const { currentHash, signature } = await generateRKSVSignature(tenantId, summaryData, lang);

        await zReportsRef.add({
            ...summaryData,
            rksvHash: currentHash,
            rksvSignature: signature,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.info(`[${lang.toUpperCase()}] ${t(lang, "DAILY_REPORT_COMPLETED")} Tenant: ${tenantId} (${transactionsSnap.size} transactions)`);
    }

    console.info("🎯 Daily RKSV Z-Reports successfully generated for all tenants.");
    return null;
});
