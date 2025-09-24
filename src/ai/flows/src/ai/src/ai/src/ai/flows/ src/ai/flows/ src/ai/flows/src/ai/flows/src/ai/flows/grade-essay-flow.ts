// src/ai/flows/grade-essay-flow.ts
'use server';

/**
 * @fileOverview An AI agent for grading student essays based on a provided rubric.
 *
 * - gradeEssay - A function that grades a student's essay.
 * - GradeEssayInput - The input type for the gradeEssay function.
 * - GradeEssayOutput - The return type for the gradeEssay function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GradeEssayInputSchema = z.object({
  question: z.string().describe('The essay question that was given to the student.'),
  markingRubric: z.string().describe('The detailed marking rubric or model answer for the question. This will be used to grade the essay.'),
  studentAnswer: z.string().describe("The student's essay answer."),
});
export type GradeEssayInput = z.infer<typeof GradeEssayInputSchema>;

const GradeEssayOutputSchema = z.object({
  score: z.number().describe('The numerical score for the essay, based on the total marks specified in the rubric.'),
  feedback: z.string().describe('Detailed, constructive feedback for the student, explaining the score and suggesting areas for improvement.'),
  isCompliant: z.boolean().describe('Whether the student\'s answer was a serious attempt to answer the question.'),
});
export type GradeEssayOutput = z.infer<typeof GradeEssayOutputSchema>;

export async function gradeEssay(input: GradeEssayInput): Promise<GradeEssayOutput> {
  return gradeEssayFlow(input);
}

const essayGradingPrompt = ai.definePrompt({
  name: 'essayGradingPrompt',
  input: {schema: GradeEssayInputSchema},
  output: {schema: GradeEssayOutputSchema},
  prompt: `You are an expert AI teaching assistant. Your task is to grade a student's essay based on a provided question and marking rubric.

  Question:
  {{{question}}}

  Marking Rubric:
  {{{markingRubric}}}

  Student's Answer:
  {{{studentAnswer}}}

  Instructions:
  1.  Carefully compare the student's answer against the marking rubric.
  2.  Determine a fair score based on the total marks available in the rubric. The score you provide must not exceed the total marks specified in the rubric.
  3.  Provide detailed, constructive feedback. Explain why the student received the score they did. Highlight strengths and weaknesses, and offer specific suggestions for improvement.
  4.  If the answer is nonsensical or does not attempt to answer the question, set 'isCompliant' to false and provide feedback explaining the issue. Otherwise, set it to true.
  5.  Be encouraging and maintain a supportive tone in your feedback.`,
});

const gradeEssayFlow = ai.defineFlow(
  {
    name: 'gradeEssayFlow',
    inputSchema: GradeEssayInputSchema,
    outputSchema: GradeEssayOutputSchema,
  },
  async input => {
    const {output} = await essayGradingPrompt(input);
    return output!;
  }
);
