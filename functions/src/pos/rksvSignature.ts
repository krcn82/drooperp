
import crypto from "crypto";
import * as admin from "firebase-admin";
import { t, Language } from "../i18n";

/**
 * RKSV Signature Chain Manager
 * Her işlem bir önceki imzanın hash’i ile zincirlenir.
 * Bu, yasal işlem zincirini oluşturur.
 */
export async function generateRKSVSignature(tenantId: string, transactionData: any, lang: Language = 'en') {
  const db = admin.firestore();

  const lastSignatureDoc = await db
    .collection("tenants")
    .doc(tenantId)
    .collection("rksvSignatures")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  const lastHash = lastSignatureDoc.empty
    ? "INITIAL_HASH"
    : lastSignatureDoc.docs[0].data().currentHash;

  // Yeni hash zinciri oluştur
  const rawData = JSON.stringify(transactionData) + lastHash;
  const currentHash = crypto.createHash("sha256").update(rawData).digest("hex");

  // JWS (JSON Web Signature) simülasyonu
  const privateKey = process.env.RKSV_PRIVATE_KEY;
  if (!privateKey) throw new Error("RKSV private key not set in environment variables");

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(currentHash);
  const signature = signer.sign(privateKey, "base64");

  // Firestore’a kaydet
  await db.collection("tenants").doc(tenantId).collection("rksvSignatures").add({
    currentHash,
    lastHash,
    signature,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  console.info(`[${lang.toUpperCase()}] ${t(lang, "RKSV_SIGNATURE_CREATED")}`);

  return { currentHash, signature };
}
