'use server';
/**
 * @fileOverview A simple AI chat flow.
 *
 * - chat - A function that handles the AI chat interaction.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string(),
});

const ChatInputSchema = z.object({
  history: z.array(MessageSchema),
  message: z.string(),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  response: z.string(),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const prompt = ai.definePrompt(
  {
    name: 'chatPrompt',
    input: {schema: ChatInputSchema},
    output: {schema: ChatOutputSchema},
    prompt: `You are Droop, a helpful and friendly AI assistant for the Droop ERP system.
Your goal is to assist users with their questions about the ERP, their data, and perform tasks on their behalf.

Be concise and helpful. You can use markdown to format your responses.

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
