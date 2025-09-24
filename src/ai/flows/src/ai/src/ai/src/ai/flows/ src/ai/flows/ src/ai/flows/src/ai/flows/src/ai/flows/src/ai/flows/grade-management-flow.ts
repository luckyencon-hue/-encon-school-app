// src/ai/flows/grade-management-flow.ts
'use server';

/**
 * @fileOverview Manages student grades using AI to provide remarks and ensure data integrity.
 *
 * - manageGrades - A function that processes and updates student grades.
 * - ManageGradesInput - The input type for the manageGrades function.
 * - ManageGradesOutput - The return type for the manageGrades function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GradeSchema = z.object({
  subject: z.string(),
  firstCA: z.number().nullable(),
  secondCA: z.number().nullable(),
  project: z.number().nullable(),
  exam: z.number().nullable(),
});

const ManageGradesInputSchema = z.object({
  studentName: z.string().describe('The name of the student whose grades are being managed.'),
  grades: z.array(GradeSchema).describe('The list of grades for the student.'),
});
export type ManageGradesInput = z.infer<typeof ManageGradesInputSchema>;

const ManageGradesOutputSchema = z.object({
  updatedGrades: z.array(GradeSchema).describe('The updated list of grades for the student, including any AI-generated remarks or adjustments.'),
  overallRemark: z.string().describe('An overall remark on the student\'s performance based on the provided grades.'),
});
export type ManageGradesOutput = z.infer<typeof ManageGradesOutputSchema>;

export async function manageGrades(input: ManageGradesInput): Promise<ManageGradesOutput> {
  return manageGradesFlow(input);
}

const gradeManagementPrompt = ai.definePrompt({
  name: 'gradeManagementPrompt',
  input: {schema: ManageGradesInputSchema},
  output: {schema: ManageGradesOutputSchema},
  prompt: `You are an AI assistant for a school's academic department. Your task is to process a student's grades.

  Student Name: {{{studentName}}}
  Grades:
  {{#each grades}}
  - Subject: {{subject}}
    1st CA: {{firstCA}}
    2nd CA: {{secondCA}}
    Project: {{project}}
    Exam: {{exam}}
  {{/each}}

  Based on these grades, provide an overall remark on the student's performance.
  Return the original grade data along with your overall remark. Be encouraging and constructive in your feedback.`,
});

const manageGradesFlow = ai.defineFlow(
  {
    name: 'manageGradesFlow',
    inputSchema: ManageGradesInputSchema,
    outputSchema: ManageGradesOutputSchema,
  },
  async (input) => {
    const {output} = await gradeManagementPrompt(input);
    if (!output) {
      // If the AI fails, just return the original grades with a default remark.
      return {
        updatedGrades: input.grades,
        overallRemark: "Could not generate remark."
      }
    }
    // The prompt asks the AI to return the original grades, so we trust it here.
    return output;
  }
);
