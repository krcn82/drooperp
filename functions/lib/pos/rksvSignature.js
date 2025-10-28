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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRKSVSignature = generateRKSVSignature;
const crypto_1 = __importDefault(require("crypto"));
const admin = __importStar(require("firebase-admin"));
/**
 * RKSV Signature Chain Manager
 * Her işlem bir önceki imzanın hash’i ile zincirlenir.
 * Bu, yasal işlem zincirini oluşturur.
 */
async function generateRKSVSignature(tenantId, transactionData) {
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
    const currentHash = crypto_1.default.createHash("sha256").update(rawData).digest("hex");
    // JWS (JSON Web Signature) simülasyonu
    const privateKey = process.env.RKSV_PRIVATE_KEY;
    if (!privateKey)
        throw new Error("RKSV private key not set in environment variables");
    const signer = crypto_1.default.createSign("RSA-SHA256");
    signer.update(currentHash);
    const signature = signer.sign(privateKey, "base64");
    // Firestore’a kaydet
    await db.collection("tenants").doc(tenantId).collection("rksvSignatures").add({
        currentHash,
        lastHash,
        signature,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { currentHash, signature };
}
//# sourceMappingURL=rksvSignature.js.map