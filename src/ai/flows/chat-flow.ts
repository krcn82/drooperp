'use server';
/**
 * @fileOverview An AI chat flow with tools to query business data.
 *
 * - chat - A function that handles the AI chat interaction.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {firestoreAdmin} from '../firestore-admin';
import {Timestamp} from 'firebase-admin/firestore';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string(),
});

const ChatInputSchema = z.object({
  history: z.array(MessageSchema),
  message: z.string(),
  tenantId: z.string().describe('The ID of the tenant to which the user belongs.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  response: z.string(),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

// Tool to get a sales summary
const getSalesSummary = ai.defineTool(
  {
    name: 'getSalesSummary',
    description: 'Provides a summary of sales for a given time period (e.g., today, yesterday, last 7 days).',
    inputSchema: z.object({
      tenantId: z.string(),
      period: z.enum(['today', 'yesterday', 'last7days']).default('today'),
    }),
    outputSchema: z.object({
      totalRevenue: z.number(),
      transactionCount: z.number(),
    }),
  },
  async ({tenantId, period}) => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case 'last7days':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'today':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
    }

    const startTimestamp = Timestamp.fromDate(startDate);
    const transactionsRef = firestoreAdmin.collection(`tenants/${tenantId}/transactions`);
    const snapshot = await transactionsRef.where('timestamp', '>=', startTimestamp).get();

    let totalRevenue = 0;
    snapshot.forEach(doc => {
      totalRevenue += doc.data().amountTotal || 0;
    });

    return {
      totalRevenue: totalRevenue,
      transactionCount: snapshot.size,
    };
  }
);

// Tool to get product performance
const getProductPerformance = ai.defineTool(
  {
    name: 'getProductPerformance',
    description: 'Provides performance data for products, such as top sellers.',
    inputSchema: z.object({
      tenantId: z.string(),
      limit: z.number().default(3),
    }),
    outputSchema: z.object({
      topProducts: z.array(z.object({ name: z.string(), quantity: z.number() })),
    }),
  },
  async ({ tenantId, limit }) => {
    const transactionsRef = firestoreAdmin.collection(`tenants/${tenantId}/transactions`);
    const snapshot = await transactionsRef.get();

    const productQuantities: Record<string, { name: string, quantity: number }> = {};

    snapshot.forEach(doc => {
      const items = doc.data().items as { name: string; qty: number }[] | undefined;
      if (items) {
        items.forEach(item => {
          if (productQuantities[item.name]) {
            productQuantities[item.name].quantity += item.qty;
          } else {
            productQuantities[item.name] = { name: item.name, quantity: item.qty };
          }
        });
      }
    });

    const sortedProducts = Object.values(productQuantities).sort((a, b) => b.quantity - a.quantity);
    
    return {
      topProducts: sortedProducts.slice(0, limit),
    };
  }
);


export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const prompt = ai.definePrompt(
  {
    name: 'chatPrompt',
    input: {schema: ChatInputSchema},
    output: {schema: ChatOutputSchema},
    tools: [getSalesSummary, getProductPerformance],
    prompt: `You are Droop, a helpful and friendly AI assistant for the Droop ERP system.
Your goal is to assist users with their questions about the ERP, their data, and perform tasks on their behalf.

Be concise and helpful. You can use markdown to format your responses.

If a user asks about sales or product performance, use the provided tools to get the data.
The current tenant ID is: {{{tenantId}}}. Always pass this to the tools.

Here is the conversation history:
{{#each history}}
- {{role}}: {{text}}
{{/each}}

Here is the user's latest message:
- user: {{{message}}}
`,
  },
);

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return { response: output!.response };
  }
);
