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
exports.setupRKSVConfig = setupRKSVConfig;
exports.getRKSVConfig = getRKSVConfig;
exports.getPublicRKSVConfig = getPublicRKSVConfig;
const admin = __importStar(require("firebase-admin"));
/**
 * 🇩🇪 Initialisiert die RKSV-Konfiguration für einen neuen Mandanten.
 * 🇬🇧 Initializes the RKSV configuration for a new tenant.
 */
async function setupRKSVConfig(tenantId, data) {
    const db = admin.firestore();
    // rksvConfig is a singleton document, not a collection.
    const configRef = db.doc(`tenants/${tenantId}/rksvConfig`);
    const existing = await configRef.get();
    if (existing.exists) {
        console.log(`RKSV-Konfiguration für ${tenantId} existiert bereits.`);
        return;
    }
    await configRef.set({
        ...data,
        registeredAt: data.registeredAt || new Date().toISOString(),
        status: "active",
        lastZReport: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ RKSV-Konfiguration für ${tenantId} wurde erstellt.`);
}
/**
 * 🇩🇪 Holt die RKSV-Konfiguration für einen Mandanten.
 * 🇬🇧 Retrieves the RKSV configuration for a tenant.
 */
async function getRKSVConfig(tenantId) {
    const db = admin.firestore();
    const configRef = db.doc(`tenants/${tenantId}/rksvConfig`);
    const doc = await configRef.get();
    if (!doc.exists) {
        throw new Error(`Keine RKSV-Konfiguration für ${tenantId} gefunden.`);
    }
    return doc.data();
}
/**
 * 🇩🇪 Holt die öffentlichen, nicht-sensiblen RKSV-Konfigurationsdaten.
 * 🇬🇧 Retrieves the public, non-sensitive RKSV configuration data.
 */
async function getPublicRKSVConfig(tenantId) {
    const config = await getRKSVConfig(tenantId);
    if (!config) {
        return null;
    }
    // Return only the non-sensitive fields
    return {
        kassenId: config.kassenId,
        serialNumber: config.serialNumber,
        status: config.status,
        lastZReport: config.lastZReport,
        registeredAt: config.registeredAt,
    };
}
//# sourceMappingURL=rksv-utils.js.map