import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Creates user and tenant records in Firestore.
 * This function should be triggered after a new user signs up.
 */
export const registerTenant = functions.https.onCall(async (data, context) => {
  const { tenantId, tenantName, ownerEmail } = data;
  const uid = context.auth?.uid;

  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  if (!tenantId || !tenantName || !ownerEmail) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required data: tenantId, tenantName, or ownerEmail.');
  }
  
  const firestore = admin.firestore();
  const batch = firestore.batch();

  // 1. Create Tenant Document
  const tenantRef = firestore.doc(`/tenants/${tenantId}`);
  batch.set(tenantRef, {
    id: tenantId,
    name: tenantName,
    ownerEmail: ownerEmail,
    ownerUid: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    plan: 'free',
  });

  // 2. Create User Document in Tenant Subcollection
  const userRef = firestore.doc(`/tenants/${tenantId}/users/${uid}`);
  batch.set(userRef, {
    id: uid,
    email: ownerEmail,
    roles: ['admin'],
    tenantId: tenantId,
  });

  // 3. Create User-Tenant Mapping for Security Rules
  const userTenantMappingRef = firestore.doc(`/users/${uid}`);
  batch.set(userTenantMappingRef, { tenantId: tenantId });
  
  try {
    await batch.commit();
    return { success: true, message: `Tenant '${tenantName}' created successfully.` };
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw new functions.https.HttpsError('internal', 'An error occurred while creating the tenant.', error);
  }
});
