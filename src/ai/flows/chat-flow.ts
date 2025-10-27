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

const SuggestionSchema = z.object({
    title: z.string().describe('A short, actionable title for the suggestion.'),
    description: z.string().describe('A longer description of the suggestion and why it is being made.'),
    action: z.string().describe('A unique key for the action to be taken, e.g., "apply_discount_slow_moving".'),
    items: z.array(z.object({
        id: z.string(),
        name: z.string(),
    })).optional().describe('An optional list of items related to the suggestion.'),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;


const ChatOutputSchema = z.object({
  response: z.string().describe('The textual response from the AI assistant.'),
  suggestion: SuggestionSchema.optional().describe('An optional structured suggestion for the user to act upon.'),
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
    description: 'Provides performance data for products, such as top sellers or slow-moving items.',
    inputSchema: z.object({
      tenantId: z.string(),
      limit: z.number().default(5),
      orderBy: z.enum(['top', 'bottom']).default('top'),
      periodDays: z.number().default(30),
    }),
    outputSchema: z.object({
      products: z.array(z.object({ id: z.string(), name: z.string(), quantity: z.number() })),
    }),
  },
  async ({ tenantId, limit, orderBy, periodDays }) => {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - periodDays);
    const sinceTimestamp = Timestamp.fromDate(sinceDate);

    const transactionsRef = firestoreAdmin.collection(`tenants/${tenantId}/transactions`);
    const snapshot = await transactionsRef.where('timestamp', '>=', sinceTimestamp).get();

    const productQuantities: Record<string, { id: string; name: string, quantity: number }> = {};

    snapshot.forEach(doc => {
      const items = doc.data().items as { productId: string; name: string; qty: number }[] | undefined;
      if (items) {
        items.forEach(item => {
          const id = item.productId || item.name; // Fallback to name if id is not present
          if (productQuantities[id]) {
            productQuantities[id].quantity += item.qty;
          } else {
            productQuantities[id] = { id: id, name: item.name, quantity: item.qty };
          }
        });
      }
    });

    const sortedProducts = Object.values(productQuantities).sort((a, b) => {
        return orderBy === 'top' ? b.quantity - a.quantity : a.quantity - b.quantity;
    });
    
    return {
      products: sortedProducts.slice(0, limit),
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
You must follow these steps:
1.  Detect the language of the user's message ({{{message}}}). Supported languages are English, German, and Turkish.
2.  If the user's language is not English, translate their message and the conversation history to English before proceeding.
3.  Use the provided tools to answer the user's question, using the translated English query. The tools only work with English.
4.  Formulate your response in English.
5.  Translate the final English response back into the user's original detected language before replying.

Be concise and helpful. You can use markdown to format your responses.

If you identify a clear opportunity, like slow-moving products, provide a structured suggestion for the user to act upon. For example, suggest applying a discount to slow-moving items.

The current tenant ID is: {{{tenantId}}}. Always pass this to the tools.

Here is the conversation history (translate if necessary):
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
    return output!;
  }
);
