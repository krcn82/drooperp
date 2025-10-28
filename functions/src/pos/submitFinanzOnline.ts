import * as admin from "firebase-admin";
import fetch from "node-fetch";
import { logFinanzOnlineTransmission } from "./logFinanzOnline";
import { logError } from "../lib/error-logging";

if (!admin.apps.length) admin.initializeApp();

/**
 * 🇩🇪 Sendet den DEP-Export automatisch an das FinanzOnline-System.
 * 🇬🇧 Automatically submits the DEP export file to FinanzOnline.
 */
export async function submitDEPToFinanzOnline(tenantId: string, date: string) {
  const db = admin.firestore();

  try {
    const configSnap = await db.collection(`tenants/${tenantId}/rksvConfig`).limit(1).get();
    if (configSnap.empty) throw new Error("Keine RKSV-Konfiguration gefunden.");
    const config = configSnap.docs[0].data();

    const storage = admin.storage().bucket();
    const fileName = `exports/${tenantId}/DEP-${date}.xml`;
    const file = storage.file(fileName);
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`Kein DEP-Export für ${date} in Storage gefunden. Bitte zuerst generieren.`);
    }
    
    const [xmlBuffer] = await file.download();
    const xmlString = xmlBuffer.toString("utf-8");

    const endpoint = config.useSandbox
      ? "https://test.finanzonline.bmf.gv.at/fonws/ws/"
      : "https://finanzonline.bmf.gv.at/fonws/ws/";

    const body = {
      TeilnehmerId: config.finanzOnlineSubId,
      BenutzerId: config.finanzOnlineUser,
      Passwort: config.finanzOnlinePassword, // Note: This should be a secret!
      DEP: xmlString,
      Typ: "RKSV-DEP-EXPORT",
      Datum: date,
    };

    const response = await fetch(endpoint + "rkws/depUpload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.text();
    
    await logFinanzOnlineTransmission(tenantId, date, response.ok ? "success" : "failed", result);
    
    console.log(`📤 DEP-Export von ${tenantId} → FinanzOnline gesendet.`);
    return { status: response.ok ? "success" : "failed", result };

  } catch (err: any) {
    console.error(`❌ Fehler bei der Übertragung an FinanzOnline für ${tenantId}:`, err);
    await logError(tenantId, "submitDEPToFinanzOnline", err.message || "unknown error", "critical");
    // Re-throw the error so the caller knows the submission failed
    throw err;
  }
}
