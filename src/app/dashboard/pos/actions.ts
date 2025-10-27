'use server';

import { initializeFirebase } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

type TransactionData = {
  productIds: string[];
  quantities: number[];
  cashierUserId: string;
  amountTotal: number;
  paymentMethod: 'cash' | 'card';
  type: 'shop' | 'restaurant';
};

export async function recordTransaction(tenantId: string, data: TransactionData) {
  if (!tenantId) {
    return { success: false, message: 'Tenant ID is missing.' };
  }

  const { firebaseApp } = initializeFirebase();
  const functions = getFunctions(firebaseApp);
  
  try {
    const recordTransactionFn = httpsCallable(functions, 'recordTransaction');
    const result: any = await recordTransactionFn({ tenantId, transactionData: data });

    if (result.data.status === 'success') {
      return { success: true, transactionId: result.data.transactionId, qrCode: result.data.qrCode };
    } else {
      return { success: false, message: 'Cloud function reported an error.' };
    }
  } catch (error: any) {
    console.error('Failed to record transaction via cloud function:', error);
    return { success: false, message: error.message || 'Could not save transaction.' };
  }
}
