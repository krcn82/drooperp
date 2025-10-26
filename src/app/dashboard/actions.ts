'use server';

import { addDocumentNonBlocking, initializeFirebase } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { chat, ChatInput, ChatOutput } from '@/ai/flows/chat-flow';

type TransactionData = {
  productIds: string[];
  quantities: number[];
  cashierUserId: string;
  amountTotal: number;
  paymentMethod: 'cash' | 'card';
};

// This function is designed to be non-blocking on the client side.
// It initiates the write and returns a promise that resolves with success/failure,
// while permission errors are handled globally by the FirestorePermissionError system.
export async function recordTransaction(tenantId: string, data: TransactionData) {
  if (!tenantId) {
    // This is a validation error, not a permission error, so we can return it directly.
    return { success: false, message: 'Tenant ID is missing.' };
  }

  const { firestore } = initializeFirebase();
  const transactionsRef = collection(firestore, `tenants/${tenantId}/transactions`);

  try {
    // addDocumentNonBlocking returns a promise with the doc reference.
    // It also has a .catch() internally that emits permission errors.
    const docRef = await addDocumentNonBlocking(transactionsRef, {
      ...data,
      timestamp: serverTimestamp(),
    });
    
    // If we get here, the local cache was updated and the write is pending.
    // We can optimistically return success.
    return { success: true, transactionId: docRef.id };
  } catch (error) {
    // This outer catch will now primarily handle non-permission errors
    // (e.g., network issues if offline persistence is disabled),
    // as permission errors are handled inside addDocumentNonBlocking.
    console.error('Failed to record transaction:', error);
    
    return { success: false, message: 'Could not save transaction to the database.' };
  }
}

type Message = {
    role: 'user' | 'model';
    text: string;
}

export async function sendChatMessage(
  tenantId: string,
  chatId: string,
  message: string,
  history: Message[]
): Promise<{ success: boolean; response?: string, message?: string }> {
  if (!tenantId || !chatId || !message) {
    return { success: false, message: 'Missing required parameters.' };
  }

  try {
    const input: ChatInput = {
      tenantId,
      history: history.map(m => ({ role: m.role, text: m.text })),
      message,
    };
    const result: ChatOutput = await chat(input);
    return { success: true, response: result.response };
  } catch (e: any) {
    console.error('Error in sendChatMessage:', e);
    return { success: false, message: e.message || 'An error occurred while communicating with the AI.' };
  }
}
