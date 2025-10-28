
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * 🇩🇪 Einheitliches Fehlerprotokollsystem.
 * 🇬🇧 Unified error logging system for POS and FinanzOnline.
 */
export async function logError(
  tenantId: string,
  fn: string,
  details: string,
  severity: "warning" | "error" | "critical" = "error"
) {
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
