// src/ai/flows/generate-test-questions-flow.ts
'use server';

/**
 * @fileOverview An AI agent for generating test questions from a topic.
 *
 * - generateTestQuestions - A function that generates test questions based on a topic.
 * - GenerateTestQuestionsInput - The input type for the generateTestQuestions function.
 * - GenerateTestQuestionsOutput - The return type for the generateTestQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTestQuestionsInputSchema = z.object({
  topic: z.string().describe('The central topic for the test questions.'),
  subject: z.string().describe('The subject the topic belongs to (e.g., Biology, History).'),
  className: z.string().describe('The class level the questions are for (e.g., SS1, JSS 2).'),
  numObjective: z.coerce.number().describe('The number of objective questions to generate.'),
  numEssay: z.coerce.number().describe('The number of essay questions to generate.'),
});
export type GenerateTestQuestionsInput = z.infer<typeof GenerateTestQuestionsInputSchema>;

const ObjectiveQuestionSchema = z.object({
  question: z.string().describe('The full text of the objective question.'),
  options: z.array(z.string()).min(4).max(4).describe('An array of 4 possible options for the question.'),
  correctAnswer: z.string().describe('The correct option from the provided options.'),
});

const EssayQuestionSchema = z.object({
  question: z.string().describe('The full text of the essay question.'),
  markingRubric: z.string().describe('A detailed marking rubric or model answer for the essay question.'),
});


const GenerateTestQuestionsOutputSchema = z.object({
    objectiveQuestions: z.array(ObjectiveQuestionSchema).optional().describe('An array of generated objective questions.'),
    essayQuestions: z.array(EssayQuestionSchema).optional().describe('An array of generated essay questions.'),
});
export type GenerateTestQuestionsOutput = z.infer<typeof GenerateTestQuestionsOutputSchema>;

export async function generateTestQuestions(input: GenerateTestQuestionsInput): Promise<GenerateTestQuestionsOutput> {
  return generateTestQuestionsFlow(input);
}

const generateQuestionsPrompt = ai.definePrompt({
  name: 'generateQuestionsPrompt',
  input: {schema: GenerateTestQuestionsInputSchema},
  output: {schema: GenerateTestQuestionsOutputSchema},
  prompt: `You are an expert Nigerian secondary school teacher and examiner. Your task is to generate high-quality test questions based on a given topic for a specific class and subject.

  Topic: {{{topic}}}
  Subject: {{{subject}}}
  Class: {{{className}}}
  Number of Objective Questions: {{{numObjective}}}
  Number of Essay Questions: {{{numEssay}}}

  Instructions:
  1.  Generate exactly the requested number of objective and essay questions.
  2.  For objective questions, provide four plausible options (A, B, C, D) and clearly indicate the correct answer. The options should be distinct and challenging.
  3.  For essay questions, provide a detailed and clear question. Also, generate a comprehensive marking rubric or a model answer that can be used for grading.
  4.  Ensure the difficulty and content of the questions are appropriate for the specified Nigerian class level (e.g., SS1, JSS 2).
  5.  The questions should be clear, unambiguous, and directly related to the provided topic.

  Return the generated questions in the specified JSON format.`,
});

const generateTestQuestionsFlow = ai.defineFlow(
  {
    name: 'generateTestQuestionsFlow',
    inputSchema: GenerateTestQuestionsInputSchema,
    outputSchema: GenerateTestQuestionsOutputSchema,
  },
  async input => {
    const {output} = await generateQuestionsPrompt(input);
    return output!;
  }
);
