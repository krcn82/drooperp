'use server';
/**
 * @fileOverview A GDPR data discovery AI agent.
 *
 * - gdprDataDiscovery - A function that handles the GDPR data discovery process.
 * - GDPRDataDiscoveryInput - The input type for the gdprDataDiscovery function.
 * - GDPRDataDiscoveryOutput - The return type for the gdprDataDiscovery function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GDPRDataDiscoveryInputSchema = z.object({
  userId: z.string().describe('The user ID for whom to discover data.'),
});
export type GDPRDataDiscoveryInput = z.infer<typeof GDPRDataDiscoveryInputSchema>;

const GDPRDataDiscoveryOutputSchema = z.object({
  collections: z.array(
    z.object({
      collectionName: z.string().describe('The name of the collection.'),
      documentIds: z.array(z.string()).describe('The IDs of documents in the collection that contain user data.'),
    })
  ).describe('A list of collections and document IDs that may contain user data.'),
});
export type GDPRDataDiscoveryOutput = z.infer<typeof GDPRDataDiscoveryOutputSchema>;

export async function gdprDataDiscovery(input: GDPRDataDiscoveryInput): Promise<GDPRDataDiscoveryOutput> {
  return gdprDataDiscoveryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gdprDataDiscoveryPrompt',
  input: {schema: GDPRDataDiscoveryInputSchema},
  output: {schema: GDPRDataDiscoveryOutputSchema},
  prompt: `You are an expert in GDPR compliance and data discovery.

  Given a user ID, your task is to identify all Firestore collections that may contain data related to that user.
  For each collection, identify the specific document IDs that are likely to contain user data.

  User ID: {{{userId}}}

  Consider the following Firestore structure:
  - /users/{userId}
  - /tenants/{tenantId}/users/{userId}
  - /tenants/{tenantId}/transactions/{transactionId}
  - /tenants/{tenantId}/products/{productId}
  - /global/plans/{planId}

  A user's data might be directly in /users/{userId}, or within a tenant's subcollections.
  Analyze the collections and infer which documents might be associated with the given userId.
  For example, a transactionId might contain the userId within it.

  Format your output as a JSON object with a 'collections' array. Each object in the array should have 'collectionName' and 'documentIds' fields.
`,
});

const gdprDataDiscoveryFlow = ai.defineFlow(
  {
    name: 'gdprDataDiscoveryFlow',
    inputSchema: GDPRDataDiscoveryInputSchema,
    outputSchema: GDPRDataDiscoveryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
