// src/ai/flows/generate-student-remark-flow.ts
'use server';

/**
 * @fileOverview An AI agent for generating personalized remarks for student report cards.
 *
 * - generateStudentRemark - A function that analyzes student performance and generates a remark.
 * - GenerateStudentRemarkInput - The input type for the function.
 * - GenerateStudentRemarkOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GradeSummarySchema = z.object({
  subject: z.string(),
  totalScore: z.number(),
});

const GenerateStudentRemarkInputSchema = z.object({
  studentName: z.string().describe("The student's name."),
  grades: z.array(GradeSummarySchema).describe("A summary of the student's scores in various subjects."),
  overallAverage: z.number().describe("The student's overall average score."),
  attendance: z.object({
    present: z.number(),
    absent: z.number(),
  }).describe("The student's attendance summary."),
  psychomotorSkills: z.array(z.object({ skill: z.string(), rating: z.number() })).optional().describe("The student's rating in psychomotor skills (1-5)."),
  perspective: z.enum(['Form Teacher', 'Principal']).describe("The perspective from which to write the remark."),
});
export type GenerateStudentRemarkInput = z.infer<typeof GenerateStudentRemarkInputSchema>;

const GenerateStudentRemarkOutputSchema = z.object({
  remark: z.string().describe('A concise, personalized, and constructive remark for the student.'),
});
export type GenerateStudentRemarkOutput = z.infer<typeof GenerateStudentRemarkOutputSchema>;

export async function generateStudentRemark(input: GenerateStudentRemarkInput): Promise<GenerateStudentRemarkOutput> {
  return generateStudentRemarkFlow(input);
}

const remarkGenerationPrompt = ai.definePrompt({
  name: 'generateStudentRemarkPrompt',
  input: {schema: GenerateStudentRemarkInputSchema},
  output: {schema: GenerateStudentRemarkOutputSchema},
  prompt: `You are an experienced and insightful Nigerian educator acting as a {{{perspective}}}. Your task is to write a personalized, constructive, and encouraging remark for a student's end-of-term report based on the data provided.

  Student's Name: {{{studentName}}}
  Overall Average Score: {{{overallAverage}}}%

  Subject Performance (out of 100):
  {{#each grades}}
  - {{{subject}}}: {{{totalScore}}}
  {{/each}}

  Attendance:
  - Days Present: {{{attendance.present}}}
  - Days Absent: {{{attendance.absent}}}

  {{#if psychomotorSkills}}
  Psychomotor & Affective Skills (rated 1-5):
  {{#each psychomotorSkills}}
  - {{{skill}}}: {{{rating}}}
  {{/each}}
  {{/if}}

  Instructions:
  1.  Start by addressing the student by name.
  2.  Comment on their overall performance based on the average score.
  3.  Highlight 1-2 specific subjects where they performed exceptionally well or showed significant improvement.
  4.  Gently point out 1-2 subjects where there is room for improvement, and offer a constructive suggestion.
  5.  Mention their attendance, especially if it's excellent or poor, and correlate it to their performance if relevant.
  6.  Incorporate a comment on their psychomotor/affective skills if the data is available.
  7.  Keep the tone professional, encouraging, and tailored to the Nigerian educational context.
  8.  The entire remark should be a concise paragraph, no more than 3-4 sentences.

  Generate the final remark.`,
});

const generateStudentRemarkFlow = ai.defineFlow(
  {
    name: 'generateStudentRemarkFlow',
    inputSchema: GenerateStudentRemarkInputSchema,
    outputSchema: GenerateStudentRemarkOutputSchema,
  },
  async input => {
    const {output} = await remarkGenerationPrompt(input);
    return output!;
  }
);
