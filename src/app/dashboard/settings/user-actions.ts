'use server';

import { initializeFirebase, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

type UserRole = 'admin' | 'cashier' | 'viewer';

export async function inviteUser(
  tenantId: string,
  email: string,
  role: UserRole
): Promise<{ success: boolean; message: string }> {
  if (!tenantId || !email || !role) {
    return { success: false, message: 'Missing required fields.' };
  }

  const { firestore } = initializeFirebase();
  const usersRef = collection(firestore, `tenants/${tenantId}/users`);

  try {
    // We use addDocumentNonBlocking to let Firestore handle the ID generation
    // and to align with our non-blocking error handling strategy.
    await addDocumentNonBlocking(usersRef, {
      email: email,
      role: role,
      status: 'invited',
      createdAt: serverTimestamp(),
      tenantId: tenantId,
    });
    
    // In a real app, you would also trigger a Firebase Auth email invitation here.
    // e.g., using a custom Cloud Function that sends an email with a sign-up link.

    return { success: true, message: 'User has been invited successfully.' };
  } catch (error) {
    console.error('Error inviting user:', error);
    if (error instanceof FirebaseError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
