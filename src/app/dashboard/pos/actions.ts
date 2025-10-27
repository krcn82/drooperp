'use server';

import { initializeFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, doc, serverTimestamp } from 'firebase/firestore';

type TransactionData = {
  items: { name: string; qty: number; price: number; productId: string }[];
  cashierUserId: string;
  amountTotal: number;
  paymentMethod: 'cash' | 'card' | 'stripe' | 'bankomat';
  type: 'shop' | 'restaurant';
};

type ConfirmationData = {
  transactionId: string;
  cashierUserId: string;
};

export async function recordTransaction(tenantId: string, data: Omit<TransactionData, 'paymentMethod'>) {
  if (!tenantId) {
    return { success: false, message: 'Tenant ID is missing.' };
  }

  const { firebaseApp, firestore } = initializeFirebase();
  const functions = getFunctions(firebaseApp);
  
  try {
    const transactionRef = doc(collection(firestore, `tenants/${tenantId}/transactions`));

    const transactionPayload = {
      ...data,
      status: 'pending_payment', // New status
      timestamp: serverTimestamp(),
    };

    // This is now just creating the transaction doc, not handling payment/RKSV
    await addDocumentNonBlocking(transactionRef, transactionPayload);
    
    return { success: true, transactionId: transactionRef.id, qrCode: null };

  } catch (error: any) {
    console.error('Failed to record transaction:', error);
    return { success: false, message: error.message || 'Could not create transaction.' };
  }
}

export async function processPayment(
  tenantId: string, 
  transactionId: string,
  paymentData: { method: 'cash' | 'card' | 'stripe' | 'bankomat'; amount: number }
) {
  if (!tenantId || !transactionId || !paymentData) {
    return { success: false, message: 'Missing required data.' };
  }

  const { firestore } = initializeFirebase();
  
  try {
    const paymentRef = doc(collection(firestore, `tenants/${tenantId}/payments`));
    const transactionRef = doc(firestore, `tenants/${tenantId}/transactions`, transactionId);

    // 1. Create payment record
    await addDocumentNonBlocking(paymentRef, {
      ...paymentData,
      transactionId,
      tenantId,
      timestamp: serverTimestamp(),
      status: 'completed'
    });

    // 2. Update transaction status
    await updateDocumentNonBlocking(transactionRef, {
      status: 'paid',
      paymentMethod: paymentData.method,
      paymentId: paymentRef.id,
    });
    
    // In a real app, you would now call the RKSV signing function
    // For now, we will just return a success state.
    // const rksvResult = await signTransaction(tenantId, transactionId);

    return { success: true, paymentId: paymentRef.id, qrCode: 'sample-qr-code-data' };
    
  } catch (error: any) {
    console.error('Failed to process payment:', error);
    return { success: false, message: error.message || 'Could not process payment.' };
  }
}


export async function confirmIntegrationOrder(tenantId: string, data: ConfirmationData) {
  if (!tenantId || !data.transactionId) {
    return { success: false, message: 'Tenant or Transaction ID is missing.' };
  }

  const { firebaseApp } = initializeFirebase();
  const functions = getFunctions(firebaseApp);
  
  try {
    const recordTransactionFn = httpsCallable(functions, 'recordTransaction');
    // We call the same function, but with a different payload structure
    const result: any = await recordTransactionFn({ tenantId, transactionData: data });

    if (result.data.status === 'success') {
      return { success: true, transactionId: result.data.transactionId, qrCode: result.data.qrCode };
    } else {
      return { success: false, message: 'Cloud function reported an error.' };
    }
  } catch (error: any) {
    console.error('Failed to confirm transaction via cloud function:', error);
    return { success: false, message: error.message || 'Could not save transaction.' };
  }
}
