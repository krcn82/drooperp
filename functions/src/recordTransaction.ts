
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { generateRKSVSignature } from "./pos/rksvSignature";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const recordTransaction = functions
  .region("us-central1")
  .https.onCall(async (data, context) => {
    const { tenantId, transaction } = data;

    if (!tenantId || !transaction) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "tenantId and transaction are required."
      );
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
    const { currentHash, signature } = await generateRKSVSignature(
      tenantId,
      transaction
    );

    // 💬 3️⃣ İşleme RKSV verileri ekleniyor
    await transactionRef.update({
      rksvSignature: signature,
      rksvHash: currentHash,
      rksvTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.info(
      `✅ Transaction ${transactionRef.id} processed successfully for tenant ${tenantId}`
    );

    return {
      status: "success",
      transactionId: transactionRef.id,
      rksvSignature: signature,
      rksvHash: currentHash,
    };
  });
