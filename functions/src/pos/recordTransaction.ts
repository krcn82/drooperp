
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * POS Transaction kaydı oluşturur
 * - QR kod üretimi (dummy format)
 * - Firestore kaydı
 * - Tenant bazlı işlem izleme
 */
export const recordTransaction = onCall(async (request) => {
  try {
    // Kullanıcı doğrulama
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Bu işlemi gerçekleştirmek için giriş yapılmalıdır."
      );
    }

    const tenantId = request.data.tenantId;
    const transactionData = request.data.transactionData;

    if (!tenantId || !transactionData) {
      throw new HttpsError(
        "invalid-argument",
        "Eksik işlem verisi veya tenant ID."
      );
    }

    const { items, totalAmount, paymentMethod } = transactionData;

    if (!items || !totalAmount || !paymentMethod) {
      throw new HttpsError(
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
        createdBy: request.auth.uid,
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
    if (error instanceof HttpsError) {
        throw error;
    }
    throw new HttpsError(
      "internal",
      `İşlem kaydı başarısız: ${error.message}`
    );
  }
});
