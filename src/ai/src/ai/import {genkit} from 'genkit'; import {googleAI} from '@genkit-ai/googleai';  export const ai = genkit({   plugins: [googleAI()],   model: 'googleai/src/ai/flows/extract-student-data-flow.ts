// src/ai/flows/extract-student-data-flow.ts
'use server';

/**
 * @fileOverview An AI agent for extracting structured data from an image of a student enrollment form.
 *
 * - extractStudentData - A function that scans an enrollment form image and returns structured data.
 * - ExtractStudentDataInput - The input type for the extractStudentData function.
 * - ExtractStudentDataOutput - The return type for the extractStudentData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractStudentDataInputSchema = z.object({
  formImage: z
    .string()
    .describe(
      "A photo of a completed student enrollment form, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractStudentDataInput = z.infer<typeof ExtractStudentDataInputSchema>;

// Note: This schema should mirror the fields in the enrollment form.
// The AI will attempt to fill these fields from the provided image.
const ExtractStudentDataOutputSchema = z.object({
    firstName: z.string().optional().describe("The student's first name."),
    middleName: z.string().optional().describe("The student's middle name."),
    surname: z.string().optional().describe("The student's surname."),
    regNo: z.string().optional().describe("The student's registration number."),
    email: z.string().optional().describe("The student's email address."),
    dob: z.string().optional().describe("The student's date of birth in YYYY-MM-DD format."),
    parentName: z.string().optional().describe("The name of the student's parent or guardian."),
    parentContact: z.string().optional().describe("The contact phone number or email of the parent/guardian."),
    classId: z.string().optional().describe("The ID of the class the student should be enrolled in."),
    nationality: z.string().optional().describe("The student's nationality."),
    stateOfOrigin: z.string().optional().describe("The student's state of origin."),
    lga: z.string().optional().describe("The student's Local Government Area (LGA)."),
    hobbies: z.string().optional().describe("A comma-separated list of the student's hobbies."),
    bloodGroup: z.string().optional().describe("The student's blood group (e.g., O+, A-, AB+)."),
    genotype: z.string().optional().describe("The student's genotype (e.g., AA, AS, SS)."),
    disabilities: z.string().optional().describe("Any listed disabilities. 'None' if not specified."),
    healthConditions: z.string().optional().describe("Any listed known health conditions. 'None' if not specified."),
});
export type ExtractStudentDataOutput = z.infer<typeof ExtractStudentDataOutputSchema>;

export async function extractStudentData(input: ExtractStudentDataInput): Promise<ExtractStudentDataOutput> {
  return extractStudentDataFlow(input);
}

const extractDataPrompt = ai.definePrompt({
  name: 'extractDataPrompt',
  input: {schema: ExtractStudentDataInputSchema},
  output: {schema: ExtractStudentDataOutputSchema},
  prompt: `You are a highly accurate data entry specialist AI. Your task is to analyze the provided image of a student enrollment form and extract the information into a structured JSON format.

  Analyze the following form image:
  {{media url=formImage}}

  Carefully read all handwritten and typed text in the image. Identify the labels and corresponding values for each field.
  
  - For the 'dob' field, infer the date and return it strictly in 'YYYY-MM-DD' format.
  - For all other fields, extract the information as accurately as possible.
  - If a field is not present or is illegible, omit it from the output.

  Return the extracted data according to the specified output schema.`,
});

const extractStudentDataFlow = ai.defineFlow(
  {
    name: 'extractStudentDataFlow',
    inputSchema: ExtractStudentDataInputSchema,
    outputSchema: ExtractStudentDataOutputSchema,
  },
  async input => {
    const {output} = await extractDataPrompt(input);
    return output!;
  }
);
