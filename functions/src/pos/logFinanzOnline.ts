import * as admin from "firebase-admin";
import { logError } from "../lib/error-logging";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * 🇩🇪 Protokolliert jede FinanzOnline-Übertragung.
 * 🇬🇧 Logs each FinanzOnline transmission for auditing and compliance.
 */
export async function logFinanzOnlineTransmission(
  tenantId: string,
  date: string,
  status: "success" | "failed" | "warning",
  response: string
) {
  const db = admin.firestore();

  try {
    await db.collection(`tenants/${tenantId}/finanzOnlineLogs`).add({
      date,
      status,
      result: response, // Align with the data model which uses 'result'
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.info(`📘 FinanzOnline-Log gespeichert für ${tenantId} (${status})`);
  } catch (err: any) {
    await logError(tenantId, "logFinanzOnlineTransmission", err.message || "unknown error");
  }
}
