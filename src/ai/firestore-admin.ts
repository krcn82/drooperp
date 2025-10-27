'use server';
/**
 * @fileoverview Initializes and exports the Firebase Admin SDK for use in server-side Genkit flows.
 * This ensures a single, secure instance of the Firestore admin client.
 */

import * as admin from 'firebase-admin';

// Prevent re-initialization in hot-reload environments
if (!admin.apps.length) {
  // Use environment variables for secure initialization.
  // Calling initializeApp() without arguments allows it to automatically
  // use GOOGLE_APPLICATION_CREDENTIALS in a local environment
  // and the Application Default Credentials in a deployed environment.
  admin.initializeApp();
}

const firestoreAdmin = admin.firestore();

export { firestoreAdmin };
