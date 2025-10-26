'use server';
/**
 * @fileoverview Initializes and exports the Firebase Admin SDK for use in server-side Genkit flows.
 * This ensures a single, secure instance of the Firestore admin client.
 */

import * as admin from 'firebase-admin';

// Prevent re-initialization in hot-reload environments
if (!admin.apps.length) {
  // Use environment variables for secure initialization
  admin.initializeApp({
    // projectId and other credentials will be picked up from the environment
    // where the Genkit flow is running (e.g., Google Cloud Functions).
  });
}

const firestoreAdmin = admin.firestore();

export { firestoreAdmin };
