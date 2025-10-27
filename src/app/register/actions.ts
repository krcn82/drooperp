'use server';

import { z } from 'zod';
import { initializeFirebase, setDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { redirect } from 'next/navigation';

const formSchema = z
  .object({
    tenantName: z.string().trim().min(3, 'Tenant name must be at least 3 characters long'),
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
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
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

  let user;
  try {
    // 1. Create the user with Firebase Auth first
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    user = userCredential.user;
    await updateProfile(user, { displayName: tenantName.trim() });
  } catch (error: any) {
    if (error instanceof FirebaseError) {
      if (error.code === 'auth/email-already-in-use') {
        return { message: 'This email is already registered.', error: true };
      }
    }
    console.error('An unexpected error occurred during user creation:', error);
    return { message: 'An unexpected error occurred during registration.', error: true };
  }

  const tenantId = sanitizeTenantId(tenantName);

  // 2. Create the tenant document
  const tenantRef = doc(firestore, 'tenants', tenantId);
  const tenantData = {
    name: tenantName.trim(),
    createdAt: serverTimestamp(),
    ownerEmail: email,
    ownerUid: user.uid,
    plan: 'Free',
    status: 'active',
  };
  // This function does not block and handles permission errors automatically
  setDocumentNonBlocking(tenantRef, tenantData, {});

  // 3. Create the user document within the tenant's subcollection
  const userRef = doc(firestore, `tenants/${tenantId}/users`, user.uid);
  const userData = {
    id: user.uid,
    email: user.email,
    firstName: '',
    lastName: '',
    role: 'admin',
    tenantId: tenantId,
  };
  setDocumentNonBlocking(userRef, userData, {});
    
  // 4. Create the mapping in the top-level users collection for security rules
  const userTenantMappingRef = doc(firestore, 'users', user.uid);
  const userTenantData = { tenantId: tenantId };
  setDocumentNonBlocking(userTenantMappingRef, userTenantData, {});
  
  // As Firestore writes are now non-blocking, we optimistically proceed.
  // If a permission error occurs, the global error handler will catch it on the client.
  // We can redirect immediately.
  redirect('/login');
}
