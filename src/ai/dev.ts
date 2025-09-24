import { config } from 'dotenv';
config();

import '@/ai/flows/calendar-data-refinement.ts';
import '@/ai/flows/grade-management-flow.ts';
import '@/ai/flows/grade-essay-flow.ts';
import '@/ai/flows/extract-student-data-flow.ts';
import '@/ai/flows/generate-test-questions-flow.ts';
import '@/ai/flows/generate-lesson-plan-flow.ts';
import '@/ai/flows/generate-student-remark-flow.ts';
