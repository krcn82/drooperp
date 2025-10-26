'use server';

import { z } from 'zod';
import { initializeFirebase, setDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { redirect } from 'next/navigation';

const formSchema = z
  .object({
    tenantName: z.string().min(3, 'Tenant name must be at least 3 characters long'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type State = {
  message: string;
  error: boolean;
};

// Sanitize tenant name to create a valid Firestore document ID
const sanitizeTenantId = (name: string) => {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

export async function registerTenant(prevState: State, formData: FormData): Promise<State> {
  const validatedFields = formSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    return {
      message: firstError || 'Invalid input.',
      error: true,
    };
  }

  const { tenantName, email, password } = validatedFields.data;
  const { auth, firestore } = initializeFirebase();

  try {
    // 1. Create the user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: tenantName });

    const tenantId = sanitizeTenantId(tenantName);

    // Use a batch to perform multiple writes atomically
    const batch = writeBatch(firestore);

    // 2. Create the tenant document
    const tenantRef = doc(firestore, 'tenants', tenantId);
    batch.set(tenantRef, {
      id: tenantId,
      name: tenantName,
      ownerEmail: email,
      createdAt: serverTimestamp(),
      plan: 'free',
    });

    // 3. Create the user document within the tenant's subcollection
    const userRef = doc(firestore, `tenants/${tenantId}/users`, user.uid);
    batch.set(userRef, {
      id: user.uid,
      email: user.email,
      firstName: '',
      lastName: '',
      roles: ['admin'],
      tenantId: tenantId,
    });
    
    // 4. Create the mapping in the top-level users collection for security rules
    const userTenantMappingRef = doc(firestore, 'users', user.uid);
    batch.set(userTenantMappingRef, { tenantId: tenantId });
    
    await batch.commit();

    // Store tenantId for the login flow to pick up
    // This is a bit of a workaround because we can't directly sign in and set session here
    // But onAuthStateChanged on the client will now handle it.
    // We can't use localStorage on the server.
    
  } catch (error: any) {
    if (error instanceof FirebaseError) {
      if (error.code === 'auth/email-already-in-use') {
        return { message: 'This email is already registered.', error: true };
      }
    }
    console.error(error);
    return { message: 'An unexpected error occurred during registration.', error: true };
  }

  // If registration is successful, Next.js will redirect
  redirect('/login');
}
