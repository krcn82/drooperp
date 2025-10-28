import * as crypto from "crypto";
import * as admin from "firebase-admin";
import { Language, t } from "../i18n";


/**
 * 🇩🇪 Erzeugt eine neue RKSV-Signatur für eine Transaktion oder einen Tagesabschluss.
 * 🇬🇧 Creates a new RKSV signature for a transaction or Z-report.
 */
export async function generateRKSVSignature(
  tenantId: string,
  data: Record<string, any>,
  lang: Language = 'en'
): Promise<{ currentHash: string; signature: string }> {
  const db = admin.firestore();

  // 🔗 Letzte Signatur holen (Chain-Verknüpfung)
  const lastSignatureSnap = await db
    .collection(`tenants/${tenantId}/signatures`)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  const lastHash = lastSignatureSnap.empty
    ? "INITIAL"
    : lastSignatureSnap.docs[0].data().hash;

  // 🧾 Daten + letzte Hash-Werte kombinieren
  const inputString = JSON.stringify(data) + lastHash;
  const currentHash = crypto
    .createHash("sha256")
    .update(inputString)
    .digest("hex");

  // 🔐 Beispielhafte RSA-Signatur (in Produktion: Hardware-Sicherheitsmodul!)
  const privateKey = process.env.RKSV_PRIVATE_KEY || "test_private_key";
  const signature = crypto
    .createHmac("sha256", privateKey)
    .update(currentHash)
    .digest("hex");

  // 💾 Speicherung in Firestore
  await db.collection(`tenants/${tenantId}/signatures`).add({
    hash: currentHash,
    signature,
    previousHash: lastHash,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  console.info(`[${lang.toUpperCase()}] ${t(lang, "RKSV_SIGNATURE_CREATED")}`);

  return { currentHash, signature };
}
