import * as admin from "firebase-admin";
import * as crypto from "crypto";

/**
 * 🇩🇪 Erzeugt eine RKSV-konforme Signatur für eine Transaktion oder den Tagesabschluss.
 * 🇬🇧 Generates an RKSV-compliant signature for a transaction or daily closing (Z-Report).
 *
 * 🔐 Anforderungen laut RKSV:
 * - Jede Transaktion muss mit der vorherigen verknüpft sein (Hash-Kette)
 * - Der Signaturwert basiert auf:
 *    {Kassen-ID, Belegnummer, Datum, Betrag, vorherige Signatur}
 */

export async function generateRKSVSignature(
  tenantId: string,
  dataToSign: object, // Generic object for flexibility
  previousSignature: string
): Promise<{ signature: string; hash: string }> {
  const db = admin.firestore();

  // Hole Tenant-Konfiguration (enthält Kassen-ID und Zertifikatsdaten)
  const tenantDoc = await db.doc(`tenants/${tenantId}`).get();
  const tenantData = tenantDoc.data();

  if (!tenantData) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  const { cashRegisterId, certPrivateKey, certSerialNumber } = tenantData.rksv || {};

  if (!certPrivateKey || !cashRegisterId) {
    throw new Error(
      `RKSV credentials missing for tenant ${tenantId}. Please configure certificate.`
    );
  }

  // === HASH-KETTE AUFBAU ===
  const dataToHash = `${cashRegisterId}|${JSON.stringify(dataToSign)}|${previousSignature}`;
  const hash = crypto.createHash("sha256").update(dataToHash).digest("base64");

  // === DIGITALE SIGNATUR (RSA-SHA256) ===
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(hash);
  const signature = signer.sign(certPrivateKey, "base64");

  // Speichere Signatur-Kette zur späteren DEP-Erstellung
  const chainRef = db.collection(`tenants/${tenantId}/rksvChain`).doc();
  await chainRef.set({
    createdAt: admin.firestore.Timestamp.now(),
    cashRegisterId,
    certSerialNumber: certSerialNumber || "UNKNOWN",
    hash,
    signature,
    previousSignature,
  });

  return { signature, hash };
}
