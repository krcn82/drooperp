'use server';

import {gdprDataDiscovery} from '@/ai/flows/gdpr-data-discovery';
import type {GDPRDataDiscoveryOutput} from '@/lib/types';
import {z} from 'zod';

const formSchema = z.object({
  userId: z.string().min(1, 'User ID is required.'),
});

type State = {
  message?: string | null;
  data?: GDPRDataDiscoveryOutput | null;
  error?: boolean;
};

export async function discoverData(prevState: State, formData: FormData): Promise<State> {
  const validatedFields = formSchema.safeParse({
    userId: formData.get('userId'),
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields.error.flatten().fieldErrors.userId?.[0] || 'Invalid input.',
      error: true,
    };
  }

  const {userId} = validatedFields.data;

  try {
    // Simulate a network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real application, you would call the actual AI flow.
    // Here we use mock data for demonstration purposes.
    const mockData: GDPRDataDiscoveryOutput = {
      collections: [
        { collectionName: "users", documentIds: [userId] },
        { collectionName: "orders", documentIds: [`order_abc_${userId}`, `order_xyz_${userId}`] },
        { collectionName: "invoices", documentIds: [`inv_2024_07_${userId}`] },
        { collectionName: "activity_logs", documentIds: [`log_1_${userId}`, `log_2_${userId}`, `log_3_${userId}`] },
      ]
    };

    // const result = await gdprDataDiscovery({ userId });
    
    return {
      message: `Data discovery successful for user: ${userId}`,
      data: mockData, // In a real scenario, use `result`
      error: false,
    };
  } catch (e) {
    console.error(e);
    return {
      message: 'An unexpected error occurred during data discovery.',
      error: true,
    };
  }
}
