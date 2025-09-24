// src/ai/flows/generate-lesson-plan-flow.ts
'use server';

/**
 * @fileOverview An AI agent for generating lesson plans, notes, and suggesting materials.
 *
 * - generateLessonPlan - A function that creates educational content for a given topic.
 * - GenerateLessonPlanInput - The input type for the function.
 * - GenerateLessonPlanOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLessonPlanInputSchema = z.object({
  topic: z.string().describe('The main topic for the lesson.'),
  subject: z.string().describe('The subject this lesson belongs to (e.g., Biology, History).'),
  className: z.string().describe('The name of the class the lesson is for (e.g., SS1, JSS 2).'),
  week: z.number().describe('The academic week number for this lesson.'),
  objectives: z.string().optional().describe('Specific learning objectives for the students. If provided, the generated content will be tailored to meet these objectives.'),
});
export type GenerateLessonPlanInput = z.infer<typeof GenerateLessonPlanInputSchema>;

const MaterialSuggestionSchema = z.object({
    type: z.enum(['video', 'article', 'interactive']).describe('The type of the suggested learning material.'),
    title: z.string().describe('The title of the material.'),
    url: z.string().url().describe('A direct URL to the material.'),
    description: z.string().describe('A brief description of why this material is relevant.'),
});

const GenerateLessonPlanOutputSchema = z.object({
  topic: z.string().describe('The lesson topic.'),
  lessonPlan: z.string().describe('A detailed, structured lesson plan for the week, formatted in Markdown. It should include daily activities, teaching methods, and assessments.'),
  lessonNote: z.string().describe('A comprehensive lesson note on the topic, formatted in Markdown. This should be detailed enough for a student to study from.'),
  suggestedMaterials: z.array(MaterialSuggestionSchema).optional().describe('A list of up to 3 relevant, publicly-accessible online learning materials (videos, articles) that supplement the lesson note.'),
});
export type GenerateLessonPlanOutput = z.infer<typeof GenerateLessonPlanOutputSchema>;

export async function generateLessonPlan(input: GenerateLessonPlanInput): Promise<GenerateLessonPlanOutput> {
  return generateLessonPlanFlow(input);
}

const lessonPlanPrompt = ai.definePrompt({
  name: 'lessonPlanPrompt',
  input: {schema: GenerateLessonPlanInputSchema},
  output: {schema: GenerateLessonPlanOutputSchema},
  prompt: `You are an expert curriculum developer and teaching assistant AI. Your task is to generate a comprehensive lesson package for a Nigerian secondary school teacher.

  Here are the details for the lesson:
  - Class: {{{className}}}
  - Subject: {{{subject}}}
  - Week: {{{week}}}
  - Topic: {{{topic}}}
  {{#if objectives}}- Specific Objectives: {{{objectives}}}{{/if}}

  Your response must include three parts:
  1.  **Lesson Plan**: Create a structured, 5-day lesson plan. Use Markdown for formatting. For each day, include:
      - A sub-topic or focus.
      - Key learning activities (e.g., lecture, group discussion, practical work).
      - Instructional materials needed.
      - A brief assessment method (e.g., class questions, short quiz).

  2.  **Lesson Note**: Write a detailed, well-structured lesson note on the main topic. Use Markdown for clear formatting, including headings, subheadings, lists, and bold text for key terms. The note must be comprehensive and complete, suitable for a student to use for self-study. Do not truncate it.

  3.  **Suggested Materials**: Provide a list of 2-3 publicly accessible online resources that would be beneficial for the students. These must be real, valid URLs. Prefer high-quality educational websites or YouTube channels (like Khan Academy, National Geographic, BBC Bitesize, etc.). For each suggestion, you must provide the type (video, article, interactive), a title, the URL, and a short description of its relevance. This part is mandatory.

  Generate the content based on the provided details, ensuring it is accurate, engaging, and appropriate for the specified class level.
  `,
});

const generateLessonPlanFlow = ai.defineFlow(
  {
    name: 'generateLessonPlanFlow',
    inputSchema: GenerateLessonPlanInputSchema,
    outputSchema: GenerateLessonPlanOutputSchema,
  },
  async input => {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const {output} = await lessonPlanPrompt(input);
        if (output) {
          return output;
        }
        // If output is null but no error was thrown, it's still a failure condition.
        throw new Error("AI returned an empty output.");
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.error("Lesson plan generation failed after multiple attempts:", error);
          throw new Error("The AI service is currently overloaded or unavailable. Please try again in a few moments.");
        }
        // Wait for a short period before retrying
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
      }
    }
     // This part should not be reachable if the loop is correct, but as a fallback:
    throw new Error("The AI service is currently unavailable. Please try again later.");
  }
);
