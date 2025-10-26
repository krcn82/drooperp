'use server';

import { z } from 'zod';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking, initializeFirebase, useAuth } from '@/firebase';
import { revalidatePath } from 'next/cache';

const formSchema = z.object({
  companyName: z.string().optional(),
  themeColor: z.string().optional(),
});

type State = {
  message?: string | null;
  error?: boolean;
};

// This is a simplified example. In a real app, you'd get the tenantId
// from the user's session after they log in.
async function getTenantIdForCurrentUser(): Promise<string | null> {
    // This function would contain logic to securely get the current user's tenantId.
    // For this example, we'll simulate it. In a real app, you would retrieve this
    // from a custom claim or a user profile document in Firestore.
    // We are using localStorage on the client, so we can't access it here.
    // This is a placeholder for a real implementation.
    return 'default-tenant';
}


export async function updateSettings(prevState: State, formData: FormData): Promise<State> {
  const { firestore } = initializeFirebase();

  const validatedFields = formSchema.safeParse({
    companyName: formData.get('companyName'),
    themeColor: formData.get('themeColor'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Invalid input.',
      error: true,
    };
  }

  try {
    const tenantId = await getTenantIdForCurrentUser();
    if (!tenantId) {
      return { message: 'User tenant not found.', error: true };
    }

    const settingsRef = doc(firestore, 'tenants', tenantId, 'settings', 'general');
    
    // Using non-blocking write
    setDocumentNonBlocking(settingsRef, validatedFields.data, { merge: true });

    revalidatePath('/dashboard/settings');
    return {
      message: 'Settings saved successfully!',
      error: false,
    };
  } catch (e: any) {
    console.error(e);
    return {
      message: e.message || 'An unexpected error occurred.',
      error: true,
    };
  }
}
