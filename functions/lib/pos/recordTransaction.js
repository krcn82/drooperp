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
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const rksvSignature_1 = require("./rksvSignature");
const i18n_1 = require("../i18n");
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.recordTransaction = (0, https_1.onCall)({ region: "us-central1" }, async (request) => {
    const { tenantId, transaction, lang = "en" } = request.data;
    if (!tenantId || !transaction) {
        throw new https_1.HttpsError("invalid-argument", "tenantId and transaction are required.");
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
    const { hash, signature } = await (0, rksvSignature_1.generateRKSVSignature)(tenantId, transaction, lang);
    // 💬 3️⃣ İşleme RKSV verileri ekleniyor
    await transactionRef.update({
        rksvSignature: signature,
        rksvHash: hash,
        rksvTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.info(`[${lang.toUpperCase()}] ${(0, i18n_1.t)(lang, "TRANSACTION_PROCESSED")}: ${transactionRef.id} for tenant ${tenantId}`);
    return {
        status: "success",
        transactionId: transactionRef.id,
        rksvSignature: signature,
        rksvHash: hash,
    };
});
//# sourceMappingURL=recordTransaction.js.map