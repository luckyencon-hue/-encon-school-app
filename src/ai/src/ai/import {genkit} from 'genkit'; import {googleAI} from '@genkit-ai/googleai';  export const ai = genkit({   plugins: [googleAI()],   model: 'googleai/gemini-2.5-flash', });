// src/ai/flows/calendar-data-refinement.ts
'use server';

/**
 * @fileOverview Refines calendar data using AI to correct inaccuracies and ensure proper formatting.
 *
 * - refineCalendarData - A function that refines calendar data.
 * - RefineCalendarDataInput - The input type for the refineCalendarData function.
 * - RefineCalendarDataOutput - The return type for the refineCalendarData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefineCalendarDataInputSchema = z.object({
  calendarData: z.string().describe('The calendar data to refine.'),
});
export type RefineCalendarDataInput = z.infer<typeof RefineCalendarDataInputSchema>;

const RefineCalendarDataOutputSchema = z.object({
  refinedCalendarData: z.string().describe('The refined calendar data.'),
});
export type RefineCalendarDataOutput = z.infer<typeof RefineCalendarDataOutputSchema>;

export async function refineCalendarData(input: RefineCalendarDataInput): Promise<RefineCalendarDataOutput> {
  return refineCalendarDataFlow(input);
}

const refineCalendarDataPrompt = ai.definePrompt({
  name: 'refineCalendarDataPrompt',
  input: {schema: RefineCalendarDataInputSchema},
  output: {schema: RefineCalendarDataOutputSchema},
  prompt: `You are an AI assistant specializing in refining calendar data.

  Correct any inaccuracies in the information provided and ensure proper formatting for display.
  The calendar data is as follows:

  {{calendarData}}

  Return the refined calendar data. Be as concise as possible.`, 
});

const refineCalendarDataFlow = ai.defineFlow(
  {
    name: 'refineCalendarDataFlow',
    inputSchema: RefineCalendarDataInputSchema,
    outputSchema: RefineCalendarDataOutputSchema,
  },
  async input => {
    const {output} = await refineCalendarDataPrompt(input);
    return output!;
  }
);
