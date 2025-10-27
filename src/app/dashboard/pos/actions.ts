'use server';

import { initializeFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, doc, serverTimestamp } from 'firebase/firestore';

type TransactionData = {
  items: { name: string; qty: number; price: number; productId: string }[];
  cashierUserId: string;
  amountTotal: number;
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

  const { firebaseApp, firestore } = initializeFirebase();
  const functions = getFunctions(firebaseApp);
  
  try {
    const paymentRef = doc(collection(firestore, `tenants/${tenantId}/payments`));
    const transactionRef = doc(firestore, `tenants/${tenantId}/transactions`, transactionId);

    // 1. Create payment record with 'pending' status
    await addDocumentNonBlocking(paymentRef, {
      ...paymentData,
      transactionId,
      tenantId,
      timestamp: serverTimestamp(),
      status: 'pending' // Initially pending for all types
    });

    // 2. Update transaction with payment details
    await updateDocumentNonBlocking(transactionRef, {
      paymentMethod: paymentData.method,
      paymentId: paymentRef.id,
    });
    
    // 3. Handle different payment methods
    if (paymentData.method === 'stripe') {
        const processStripePayment = httpsCallable(functions, 'processStripePayment');
        const result: any = await processStripePayment({ 
            tenantId,
            transactionId,
            paymentId: paymentRef.id,
            amount: paymentData.amount,
            currency: 'eur' // Or get from config
        });
        
        return { success: true, clientSecret: result.data.clientSecret, paymentId: paymentRef.id };

    } else if (paymentData.method === 'cash') {
        await updateDocumentNonBlocking(paymentRef, { status: 'completed' });
        await updateDocumentNonBlocking(transactionRef, { status: 'paid' });
        // TODO: Call RKSV signing for cash payment
        return { success: true, paymentId: paymentRef.id, qrCode: 'sample-qr-code-data' };
        
    } else if (paymentData.method === 'bankomat' || paymentData.method === 'card') {
        const startDevicePayment = httpsCallable(functions, 'startDevicePayment');
        await startDevicePayment({
            tenantId,
            transactionId,
            paymentId: paymentRef.id,
            amount: paymentData.amount
        });
        // The function returns, but the UI will show a waiting state.
        // The actual success/failure is handled by the webhook.
        return { success: true, paymentId: paymentRef.id };
    }
    
    // Fallback for methods not fully implemented with backend logic
    return { success: true, paymentId: paymentRef.id, qrCode: 'sample-qr-code-placeholder' };
    
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

    