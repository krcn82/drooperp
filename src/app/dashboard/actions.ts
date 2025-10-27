'use server';

import { addDocumentNonBlocking, initializeFirebase } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { chat, ChatInput, ChatOutput as GenkitChatOutput, Suggestion } from '@/ai/flows/chat-flow';

type TransactionData = {
  productIds: string[];
  quantities: number[];
  cashierUserId: string;
  amountTotal: number;
  paymentMethod: 'cash' | 'card';
};

export type { Suggestion };
export type ChatOutput = GenkitChatOutput;


export async function recordTransaction(tenantId: string, data: TransactionData) {
  if (!tenantId) {
    return { success: false, message: 'Tenant ID is missing.' };
  }

  const { firestore } = initializeFirebase();
  const transactionsRef = collection(firestore, `tenants/${tenantId}/transactions`);

  try {
    const docRef = await addDocumentNonBlocking(transactionsRef, {
      ...data,
      timestamp: serverTimestamp(),
    });
    
    return { success: true, transactionId: docRef.id };
  } catch (error) {
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
): Promise<{ success: boolean; output?: GenkitChatOutput, message?: string }> {
  if (!tenantId || !chatId || !message) {
    return { success: false, message: 'Missing required parameters.' };
  }

  try {
    const input: ChatInput = {
      tenantId,
      history: history.map(m => ({ role: m.role, text: m.text })),
      message,
    };
    const result: GenkitChatOutput = await chat(input);
    return { success: true, output: result };
  } catch (e: any) {
    console.error('Error in sendChatMessage:', e);
    return { success: false, message: e.message || 'An error occurred while communicating with the AI.' };
  }
}
