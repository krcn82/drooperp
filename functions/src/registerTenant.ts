import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

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

  // 2. Create User Document in Tenant Subcollection using the user's UID
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
  
  // 4. Generate RKSV keypair and initial signature
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  
  const initialSignature = crypto.createHash('sha256').update('initial').digest('hex');

  const rksvRef = firestore.doc(`/tenants/${tenantId}/settings/rksv`);
  batch.set(rksvRef, {
      publicKey: publicKey, // Store public key, private key should be stored securely elsewhere if needed
      rksvActive: true,
      lastSignature: initialSignature,
  });

  try {
    await batch.commit();
    return { success: true, message: `Tenant '${tenantName}' created successfully.` };
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw new functions.https.HttpsError('internal', 'An error occurred while creating the tenant.', error);
  }
});
