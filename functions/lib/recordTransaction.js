"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordTransaction = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * POS Transaction kaydı oluşturur
 * - QR kod üretimi (dummy format)
 * - Firestore kaydı
 * - Tenant bazlı işlem izleme
 */
exports.recordTransaction = functions.https.onCall(async (data, context) => {
    try {
        // Kullanıcı doğrulama
        if (!context.auth) {
            throw new functions.https.HttpsError("unauthenticated", "Bu işlemi gerçekleştirmek için giriş yapılmalıdır.");
        }
        const tenantId = data.tenantId;
        const transactionData = data.transactionData;
        if (!tenantId || !transactionData) {
            throw new functions.https.HttpsError("invalid-argument", "Eksik işlem verisi veya tenant ID.");
        }
        const { items, totalAmount, paymentMethod } = transactionData;
        if (!items || !totalAmount || !paymentMethod) {
            throw new functions.https.HttpsError("invalid-argument", "İşlem verileri eksik: items, totalAmount, paymentMethod zorunludur.");
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
    }
    catch (error) {
        console.error("❌ Transaction recording failed:", error);
        throw new functions.https.HttpsError("internal", `İşlem kaydı başarısız: ${error.message}`);
    }
});
//# sourceMappingURL=recordTransaction.js.map