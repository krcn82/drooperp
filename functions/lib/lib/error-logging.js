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
exports.logError = logError;
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * 🇩🇪 Einheitliches Fehlerprotokollsystem.
 * 🇬🇧 Unified error logging system for POS and FinanzOnline.
 */
async function logError(tenantId, fn, details, severity = "error") {
    const db = admin.firestore();
    const doc = {
        fn,
        details,
        severity,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection(`tenants/${tenantId}/systemErrors`).add(doc);
    console.error(`❌ [${tenantId}] ${fn} → ${details}`);
    // 📧 (Optional) E-Mail Alarmierung
    // Hier kann später sendEmailAlert(tenantId, fn, details) integriert werden.
}
//# sourceMappingURL=error-logging.js.map