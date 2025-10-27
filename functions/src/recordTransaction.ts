import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * POS Transaction kaydı oluşturur
 * - QR kod üretimi (dummy format)
 * - Firestore kaydı
 * - Tenant bazlı işlem izleme
 */
export const recordTransaction = functions.https.onCall(async (data, context) => {
  try {
    // Kullanıcı doğrulama
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Bu işlemi gerçekleştirmek için giriş yapılmalıdır."
      );
    }

    const tenantId = data.tenantId;
    const transactionData = data.transactionData;

    if (!tenantId || !transactionData) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Eksik işlem verisi veya tenant ID."
      );
    }

    const { items, totalAmount, paymentMethod } = transactionData;

    if (!items || !totalAmount || !paymentMethod) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "İşlem verileri eksik: items, totalAmount, paymentMethod zorunludur."
      );
    }

    // Firestore'a işlem kaydı
    const transactionRef = await admin.firestore()
      .collection(`tenants/${tenantId}/transactions`)
      .add({
        ...transactionData,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: context.auth.uid,
        status: "completed",
      });

    // Basit bir QR kod (örnek)
    const qrCode = `POS-${tenantId}-${transactionRef.id}`;

    console.info(`✅ Transaction ${transactionRef.id} processed successfully for tenant ${tenantId}.`);

    return {
      status: "success",
      transactionId: transactionRef.id,
      qrCode,
    };

  } catch (error: any) {
    console.error("❌ Transaction recording failed:", error);
    throw new functions.https.HttpsError(
      "internal",
      `İşlem kaydı başarısız: ${error.message}`
    );
  }
});
