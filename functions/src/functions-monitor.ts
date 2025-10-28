
import * as admin from 'firebase-admin';
import { sendEmailNotification } from './email-notifications';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Monitörleme kaydı oluşturur
 */
export const logFunctionExecution = async (
  functionName: string,
  status: 'success' | 'error',
  details?: string,
  durationMs?: number
) => {
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
      await sendEmailNotification(
        `⚠️ Firebase Function Error: ${functionName}`,
        `Function: ${functionName}\nDetails: ${details || "No details"}\nTime: ${new Date().toLocaleString()}`
      );
    }

  } catch (error) {
    console.error(`⚠️ Monitor log error for ${functionName}:`, error);
  }
};
