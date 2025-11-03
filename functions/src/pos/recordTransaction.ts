
import { HttpsError, onCall } from "firebase-functions/v2/https";
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { AnyData } from '../types';
import * as admin from "firebase-admin";
import { generateRKSVSignature } from "./rksvSignature";
import { Language, t } from "../i18n";


if (!admin.apps.length) {
  admin.initializeApp();
}

export const recordTransaction = onCall({ region: "us-central1" }, async (request: CallableRequest<AnyData>) => {
  const { tenantId, transaction, lang = "en" } = request.data as { tenantId: string; transaction: any; lang: Language };

  if (!tenantId || !transaction) {
    throw new HttpsError("invalid-argument", "tenantId and transaction are required.");
  }

  const db = admin.firestore();
  const tenantRef = db.collection("tenants").doc(tenantId);
  const transactionsRef = tenantRef.collection("transactions");

  // 💬 1️⃣ İşlem Firestore’a kaydediliyor
  const transactionRef = await transactionsRef.add({
    ...transaction,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 💬 2️⃣ RKSV imzası oluşturuluyor
  const { hash, signature } = await generateRKSVSignature(tenantId, transaction, lang);

  // 💬 3️⃣ İşleme RKSV verileri ekleniyor
  await transactionRef.update({
    rksvSignature: signature,
    rksvHash: hash,
    rksvTimestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.info(
    `[${lang.toUpperCase()}] ${t(lang, "TRANSACTION_PROCESSED")}: ${transactionRef.id} for tenant ${tenantId}`
  );

  return {
    status: "success",
    transactionId: transactionRef.id,
  rksvSignature: signature,
  rksvHash: hash,
  };
});

