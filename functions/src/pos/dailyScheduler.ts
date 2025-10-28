
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { closeDay } from "./closeDay";
import { createFinanzOnlineExport } from "./createFinanzOnlineExport";
import { submitDEPToFinanzOnline } from "./submitFinanzOnline";
import { logError } from "../lib/error-logging";
import { HttpsError } from "firebase-functions/v2/https";

if (!admin.apps.length) admin.initializeApp();

/**
 * 🇩🇪 Automatischer Tagesabschluss (Z-Bericht) für alle aktiven Tenants.
 * 🇬🇧 Automatic daily closing (Z-Report) for all active tenants.
 */
export const dailyScheduler = onSchedule(
  {
    schedule: "59 23 * * *", // Jeden Tag um 23:59 Uhr
    timeZone: "Europe/Vienna",
  },
  async (event) => {
    console.info("🕛 Starte automatischen Tagesabschluss für alle Tenants...");
    const db = admin.firestore();

    try {
      // 🔍 Alle aktiven Tenants abrufen
      const tenantsSnap = await db.collection("tenants").where("status", "==", "active").get();
      const date = new Date().toISOString().split("T")[0];

      for (const tenant of tenantsSnap.docs) {
        const tenantId = tenant.id;
        console.info(`📦 Beginne Abschluss für Tenant: ${tenantId}`);

        try {
          // Schritt 1: Z-Report generieren (Kernlogik)
          await closeDay(tenantId);

          // Schritt 2: DEP-Export erstellen
          // We are calling the callable function's implementation directly.
          // This requires a mock request object.
          const mockRequest: any = {
              data: { tenantId, date },
              auth: { uid: "system-scheduler" } // Simulate a system call
          };
          await createFinanzOnlineExport(mockRequest);

          // Schritt 3: FinanzOnline-Upload
          await submitDEPToFinanzOnline(tenantId, date);

          console.info(`✅ Tagesabschluss abgeschlossen für ${tenantId}`);
        } catch (err: any) {
          // Log error for the specific tenant and continue with others
          await logError(tenantId, "dailyScheduler-tenant-process", err.message || "Unbekannter Fehler", "critical");
        }
      }

      console.info("🏁 Automatischer Tagesabschluss für alle Tenants beendet.");
      return null;
    } catch (err: any) {
      // Catch errors in fetching tenants, etc.
      console.error("❌ Schwerwiegender Fehler im Scheduler:", err);
      // It's a good practice to log this without a tenantId if it's a global scheduler error
      await logError("system", "dailyScheduler-global", err.message || "Global scheduler failed", "critical");
      throw err; // Re-throw to let Cloud Functions know the execution failed
    }
  }
);
