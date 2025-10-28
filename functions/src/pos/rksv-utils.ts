import * as admin from "firebase-admin";

/**
 * 🇩🇪 Initialisiert die RKSV-Konfiguration für einen neuen Mandanten.
 * 🇬🇧 Initializes the RKSV configuration for a new tenant.
 */
export async function setupRKSVConfig(tenantId: string, data: {
  kassenId: string;
  certificate: string;
  privateKey: string;
  serialNumber: string;
  registeredAt?: string;
}) {
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
export async function getRKSVConfig(tenantId: string) {
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
export async function getPublicRKSVConfig(tenantId: string) {
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
