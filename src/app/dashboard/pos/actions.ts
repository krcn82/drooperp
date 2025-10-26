'use server';

import { initializeFirebase } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

type TransactionData = {
  productIds: string[];
  quantities: number[];
  cashierUserId: string;
  amountTotal: number;
  paymentMethod: 'cash' | 'card';
};

export async function recordTransaction(tenantId: string, data: TransactionData) {
  if (!tenantId) {
    return { success: false, message: 'Tenant ID is missing.' };
  }

  const { firestore } = initializeFirebase();
  const transactionsRef = collection(firestore, `tenants/${tenantId}/transactions`);

  try {
    const docRef = await addDoc(transactionsRef, {
      ...data,
      timestamp: serverTimestamp(),
    });
    return { success: true, transactionId: docRef.id };
  } catch (error) {
    console.error('Failed to record transaction:', error);
    // In a real app, you would want to use a more robust error handling
    // and maybe the non-blocking updates with error emission.
    // For this case, we return a simple error message.
    return { success: false, message: 'Could not save transaction to the database.' };
  }
}
