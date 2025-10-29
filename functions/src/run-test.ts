/**
 * This is a test script to manually trigger backend functions.
 * To run this, you can use a tool like ts-node:
 * `ts-node -r tsconfig-paths/register src/run-test.ts`
 * Make sure you have GOOGLE_APPLICATION_CREDENTIALS set up.
 */
import * as admin from 'firebase-admin';
import { closeDay } from './pos/closeDay';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    // Make sure your GOOGLE_APPLICATION_CREDENTIALS environment variable is set
    admin.initializeApp();
}

async function runTest() {
  console.log('Starting manual test...');
  try {
    // Manually trigger the closeDay function for the "demoTenant"
    await closeDay("demoTenant");
    console.log('Successfully triggered closeDay for demoTenant.');
  } catch (error) {
    console.error('Error during manual test:', error);
  }
}

runTest().then(() => {
    console.log('Test script finished.');
    process.exit(0);
}).catch(() => {
    process.exit(1);
});
