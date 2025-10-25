'use server';

import {gdprDataDiscovery} from '@/ai/flows/gdpr-data-discovery';
import {z} from 'zod';

const formSchema = z.object({
  userId: z.string().min(1, 'User ID is required.'),
});

type GDPRDataDiscoveryOutput = {
  collections: {
    collectionName: string;
    documentIds: string[];
  }[];
};

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
    const result = await gdprDataDiscovery({ userId });
    
    return {
      message: `Data discovery successful for user: ${userId}`,
      data: result,
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
