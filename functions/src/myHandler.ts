import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Lightweight example Cloud Function to use as a template.
export const myHandler = onRequest(async (req, res) => {
  try {
    // Ensure admin is initialized by the functions entrypoint (functions/src/index.ts calls admin.initializeApp())
    const db = admin.firestore();
    // Example read: return collection count (fast demo - not optimized)
    const snapshot = await db.collection('demo').limit(1).get();
    res.status(200).send({ ok: true, demoCount: snapshot.size });
  } catch (err) {
    console.error('myHandler error', err);
    res.status(500).send({ error: 'internal' });
  }
});
