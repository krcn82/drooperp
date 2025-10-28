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
exports.logFunctionExecution = void 0;
const admin = __importStar(require("firebase-admin"));
const email_notifications_1 = require("./email-notifications");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Monitörleme kaydı oluşturur
 */
const logFunctionExecution = async (functionName, status, details, durationMs) => {
    try {
        const logRef = db.collection('functions_monitor').doc();
        await logRef.set({
            functionName,
            status,
            details: details || null,
            durationMs: durationMs || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        // If the function failed, send an email notification
        if (status === 'error') {
            await (0, email_notifications_1.sendEmailNotification)(`⚠️ Firebase Function Error: ${functionName}`, `Function: ${functionName}\nDetails: ${details || "No details"}\nTime: ${new Date().toLocaleString()}`);
        }
    }
    catch (error) {
        console.error(`⚠️ Monitor log error for ${functionName}:`, error);
    }
};
exports.logFunctionExecution = logFunctionExecution;
//# sourceMappingURL=functions-monitor.js.map