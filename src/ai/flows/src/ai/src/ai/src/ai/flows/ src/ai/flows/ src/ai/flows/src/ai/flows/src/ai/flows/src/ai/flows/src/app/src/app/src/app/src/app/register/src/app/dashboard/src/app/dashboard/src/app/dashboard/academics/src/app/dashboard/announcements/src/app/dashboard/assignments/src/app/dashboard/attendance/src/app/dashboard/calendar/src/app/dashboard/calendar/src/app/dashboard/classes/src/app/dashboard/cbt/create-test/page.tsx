// src/app/dashboard/cbt/create-test/page.tsx
'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/context/user-context';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Save, ArrowLeft, UserX, Sparkles, Upload, Loader2, CheckCircle } from 'lucide-react';
import type { CbtTest, TestCategory, Student } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateTestQuestions } from '@/ai/flows/generate-test-questions-flow';

const objectiveQuestionSchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters.'),
  options: z.array(z.string().min(1, 'Option cannot be empty.')).min(2, 'At least 2 options required.').max(5, 'Maximum of 5 options.'),
  correctAnswer: z.string().min(1, 'You must select a correct answer.'),
  marks: z.coerce.number().min(1, 'Marks must be at least 1.'),
});

const essayQuestionSchema = z.object({
  question: z.string().min(10, 'Question must be at least 10 characters.'),
  markingRubric: z.string().min(10, 'Rubric must be at least 10 characters.'),
  marks: z.coerce.number().min(1, 'Marks must be at least 1.'),
});

const testSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  classId: z.string().min(1, 'Please select a class.'),
  subject: z.string().min(1, 'Please select a subject.'),
  category: z.enum(['1st CA', '2nd CA', 'Exam']),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute."),
  objectiveQuestions: z.array(objectiveQuestionSchema),
  essayQuestions: z.array(essayQuestionSchema),
  restrictedStudents: z.array(z.string()).optional(),
});

type TestFormValues = z.infer<typeof testSchema>;

const DRAFT_STORAGE_KEY = 'cbt-test-draft';

const AiQuestionGenerator = ({ onQuestionsExtracted, mainForm }: { onQuestionsExtracted: (data: any) => void, mainForm: any }) => {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [topic, setTopic] = useState('');
    const [numObjective, setNumObjective] = useState(5);
    const [numEssay, setNumEssay] = useState(1);
    const { schoolClasses } = useUser();

    // A dummy form provider to satisfy the context for FormItem, FormLabel, etc.
    const dummyForm = useForm();

    const handleGenerate = async () => {
        const { subject, classId } = mainForm.getValues();
        if (!subject || !classId) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Please select a Class and Subject in the main form first.' });
            return;
        }
        if (!topic.trim()) {
            toast({ variant: 'destructive', title: 'Topic Required', description: 'Please enter a topic to generate questions from.' });
            return;
        }

        setIsGenerating(true);
        try {
            const className = schoolClasses.find(c => c.id === classId)?.name || '';
            const result = await generateTestQuestions({
                topic,
                subject,
                className,
                numObjective,
                numEssay,
            });
            onQuestionsExtracted(result);
            toast({ title: 'Generation Successful', description: 'Questions have been generated and added to the form. Please review and save.' });
        } catch (error) {
            console.error("AI question generation failed:", error);
            toast({ variant: 'destructive', title: 'Generation Failed', description: 'Could not generate questions. Please try again.' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent"/> AI Question Generator</CardTitle>
                <CardDescription>Generate test questions automatically based on a topic. Select Class and Subject below first.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...dummyForm}>
                    <div className="space-y-4">
                        <FormItem>
                            <FormLabel>Topic</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., The Circulatory System" value={topic} onChange={(e) => setTopic(e.target.value)} disabled={isGenerating}/>
                            </FormControl>
                        </FormItem>
                         <div className="grid grid-cols-2 gap-4">
                            <FormItem>
                                <FormLabel>No. of Objectives</FormLabel>
                                <FormControl>
                                   <Input type="number" value={numObjective} onChange={(e) => setNumObjective(Number(e.target.value))} min="1" max="20" disabled={isGenerating}/>
                                </FormControl>
                            </FormItem>
                            <FormItem>
                                <FormLabel>No. of Essays</FormLabel>
                                <FormControl>
                                    <Input type="number" value={numEssay} onChange={(e) => setNumEssay(Number(e.target.value))} min="0" max="5" disabled={isGenerating}/>
                                </FormControl>
                            </FormItem>
                         </div>
                        <Button onClick={handleGenerate} className="w-full" disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles className="mr-2" />}
                            Generate Questions
                        </Button>
                    </div>
                </Form>
            </CardContent>
        </Card>
    );
};


export default function CreateTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, cbtTests, setCbtTests, schoolClasses, subjects, students } = useUser();
  const { toast } = useToast();
  const editTestId = searchParams.get('edit');
  const [existingTest, setExistingTest] = useState<CbtTest | null>(null);

  const form = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      title: '',
      classId: '',
      subject: '',
      category: '1st CA',
      duration: 30,
      objectiveQuestions: [],
      essayQuestions: [],
      restrictedStudents: [],
    },
  });

  // Load draft from localStorage on component mount
  useEffect(() => {
    if (editTestId) return; // Don't load draft if editing
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        form.reset(draftData);
      } catch (e) {
        console.error("Failed to parse draft data", e);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }
  }, [form, editTestId]);

  // Save form data to localStorage on change
  useEffect(() => {
    if (editTestId) return; // Don't save draft if editing
    const subscription = form.watch((value) => {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form.watch, form, editTestId]);
  
  useEffect(() => {
    if (!user) return;
    const canAccess = user.role === 'Admin' || user.role === 'Staff';
    if (!canAccess) {
      router.push('/dashboard/cbt');
    }
  }, [user, router]);


  const selectedClassId = form.watch('classId');

  const availableSubjectsForClass = useMemo(() => {
    if (!selectedClassId) return [];
    const selectedClass = schoolClasses.find(c => c.id === selectedClassId);
    if (!selectedClass || !selectedClass.offeredSubjects) return [];
    return subjects.filter(s => selectedClass.offeredSubjects?.includes(s.id));
  }, [selectedClassId, schoolClasses, subjects]);
  
  useEffect(() => {
    if (editTestId) {
      const testToEdit = cbtTests.find(t => t.id === editTestId);
      if (testToEdit) {
        setExistingTest(testToEdit);
        form.reset({
          title: testToEdit.title,
          classId: testToEdit.classId || '',
          subject: testToEdit.subject,
          category: testToEdit.category,
          duration: testToEdit.duration || 30,
          objectiveQuestions: testToEdit.objectiveQuestions.map(q => ({...q, options: Array.isArray(q.options) ? q.options : []})),
          essayQuestions: testToEdit.essayQuestions.map(q => ({...q})),
          restrictedStudents: testToEdit.restrictedStudents || [],
        });
      }
    }
  }, [editTestId, cbtTests, form]);


  const { fields: objFields, append: appendObj, remove: removeObj } = useFieldArray({
    control: form.control,
    name: 'objectiveQuestions',
  });

  const { fields: essayFields, append: appendEssay, remove: removeEssay } = useFieldArray({
    control: form.control,
    name: 'essayQuestions',
  });

  const handleQuestionsExtracted = (data: { objectiveQuestions?: any[], essayQuestions?: any[] }) => {
    if (data.objectiveQuestions) {
        data.objectiveQuestions.forEach(q => appendObj({
            question: q.question || '',
            options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['', '', '', ''],
            correctAnswer: q.correctAnswer || '',
            marks: 1,
        }));
    }
    if (data.essayQuestions) {
        data.essayQuestions.forEach(q => appendEssay({
            question: q.question || '',
            markingRubric: q.markingRubric || '',
            marks: 10,
        }));
    }
  };


  if (!user || (user.role !== 'Admin' && user.role !== 'Staff')) {
    return null;
  }
  
  const mySchoolClasses = schoolClasses.filter(c => c.schoolId === user?.schoolId);

  const onSubmit = (data: TestFormValues) => {
    if (existingTest) {
      const updatedTest: CbtTest = {
        ...existingTest,
        ...data,
        objectiveQuestions: data.objectiveQuestions.map((q, i) => ({ ...q, id: existingTest.objectiveQuestions[i]?.id || `q${i}` })),
        essayQuestions: data.essayQuestions.map((q, i) => ({...q, id: existingTest.essayQuestions[i]?.id || `e${i}`})),
        restrictedStudents: data.restrictedStudents || [],
      };
      setCbtTests(prev => prev.map(t => t.id === existingTest.id ? updatedTest : t));
      toast({ title: 'Test Updated', description: 'The test has been successfully updated.' });
    } else {
        const newTest: CbtTest = {
            id: `test-${Date.now()}`,
            status: 'Draft',
            dateCreated: new Date().toISOString(),
            createdBy: user.name,
            resultsPublished: false,
            schoolId: user.schoolId!,
            ...data,
            objectiveQuestions: data.objectiveQuestions.map((q, i) => ({ ...q, id: `q${i}` })),
            essayQuestions: data.essayQuestions.map((q, i) => ({...q, id: `e${i}`})),
            restrictedStudents: data.restrictedStudents || [],
        };
        setCbtTests(prev => [newTest, ...prev]);
        toast({ title: 'Test Created', description: 'The new test has been saved as a draft. An admin needs to open it for students.' });
        localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
    router.push('/dashboard/cbt');
  };

  return (
    <div className="space-y-8">
      <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2"/> Back to CBT Platform</Button>
      
      <AiQuestionGenerator onQuestionsExtracted={handleQuestionsExtracted} mainForm={form} />

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">{existingTest ? 'Edit Test' : 'Create New Test'}</CardTitle>
          <CardDescription>Design a new computer-based test for your students.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Test Details */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold font-headline">Test Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem className="lg:col-span-2">
                      <FormLabel>Test Title</FormLabel>
                      <FormControl><Input placeholder="e.g., Biology Mid-Term Assessment" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                   <FormField control={form.control} name="classId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Class</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger></FormControl>
                            <SelectContent>{mySchoolClasses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                   )} />
                   <FormField control={form.control} name="subject" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedClassId || availableSubjectsForClass.length === 0}>
                        <FormControl><SelectTrigger><SelectValue placeholder={!selectedClassId ? "Select a class first" : "Select Subject"} /></SelectTrigger></FormControl>
                        <SelectContent>{availableSubjectsForClass.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="1st CA">1st C.A.</SelectItem>
                            <SelectItem value="2nd CA">2nd C.A.</SelectItem>
                            <SelectItem value="Exam">Exam</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="duration" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 45" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Objective Questions */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold font-headline">Objective Questions</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendObj({ question: '', options: ['', '', '', ''], correctAnswer: '', marks: 1 })}><PlusCircle className="mr-2"/>Add Objective</Button>
                </div>
                {objFields.map((field, index) => (
                  <div key={field.id} className="space-y-2 p-3 border rounded-md relative bg-muted/20">
                     <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => removeObj(index)}><Trash2 size={16}/></Button>
                     <FormField control={form.control} name={`objectiveQuestions.${index}.question`} render={({ field }) => (
                        <FormItem><FormLabel>Question {index + 1}</FormLabel><FormControl><Input placeholder="Enter the question" {...field} /></FormControl><FormMessage /></FormItem>
                     )} />
                     <div className="grid grid-cols-2 gap-2">
                        {(form.getValues(`objectiveQuestions.${index}.options`) || []).map((opt, optIndex) => {
                            const isCorrect = form.watch(`objectiveQuestions.${index}.correctAnswer`) === opt && opt !== '';
                             return (
                                <FormField key={optIndex} control={form.control} name={`objectiveQuestions.${index}.options.${optIndex}`} render={({ field }) => (
                                    <FormItem>
                                        <div className="relative">
                                            <FormControl>
                                                <Input placeholder={`Option ${optIndex + 1}`} {...field} className={isCorrect ? 'border-green-500' : ''}/>
                                            </FormControl>
                                            {isCorrect && <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500"/>}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            )
                        })}
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <Controller control={form.control} name={`objectiveQuestions.${index}.correctAnswer`} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Correct Answer</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select correct option" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {form.getValues(`objectiveQuestions.${index}.options`).map((opt, optIndex) => (
                                            opt && <SelectItem key={optIndex} value={opt}>Option {optIndex + 1}: {opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name={`objectiveQuestions.${index}.marks`} render={({ field }) => (
                           <FormItem>
                               <FormLabel>Marks</FormLabel>
                               <FormControl><Input type="number" placeholder="Marks" {...field} /></FormControl>
                               <FormMessage />
                           </FormItem>
                        )} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Essay Questions */}
              <div className="space-y-4 p-4 border rounded-lg">
                 <div className="flex justify-between items-center">
                    <h3 className="font-semibold font-headline">Essay Questions</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendEssay({ question: '', markingRubric: '', marks: 10 })}><PlusCircle className="mr-2"/>Add Essay</Button>
                </div>
                {essayFields.map((field, index) => (
                    <div key={field.id} className="space-y-2 p-3 border rounded-md relative bg-muted/20">
                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => removeEssay(index)}><Trash2 size={16}/></Button>
                        <FormField control={form.control} name={`essayQuestions.${index}.question`} render={({ field }) => (
                            <FormItem><FormLabel>Essay Question {index + 1}</FormLabel><FormControl><Textarea placeholder="Enter the essay question" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`essayQuestions.${index}.markingRubric`} render={({ field }) => (
                            <FormItem><FormLabel>Marking Rubric / Model Answer</FormLabel><FormControl><Textarea placeholder="Provide a detailed marking guide for the AI." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`essayQuestions.${index}.marks`} render={({ field }) => (
                           <FormItem>
                               <FormLabel>Marks</FormLabel>
                               <FormControl><Input type="number" placeholder="Marks" {...field} /></FormControl>
                               <FormMessage />
                           </FormItem>
                        )} />
                    </div>
                ))}
              </div>

              {/* Student Access Control */}
              {user.role === 'Admin' && existingTest && (
                <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold font-headline flex items-center gap-2"><UserX /> Student Access Control</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Select students to restrict them from taking this test. This can be due to unpaid fees, suspension, etc.</p>
                     <ScrollArea className="h-72 w-full rounded-md border">
                        <div className="p-4">
                            <FormField
                                control={form.control}
                                name="restrictedStudents"
                                render={() => (
                                    <FormItem>
                                        {students.map((student) => (
                                        <FormField
                                            key={student.regNo}
                                            control={form.control}
                                            name="restrictedStudents"
                                            render={({ field }) => {
                                            return (
                                                <FormItem
                                                key={student.regNo}
                                                className="flex flex-row items-start space-x-3 space-y-0 py-2"
                                                >
                                                <FormControl>
                                                    <Checkbox
                                                    checked={field.value?.includes(student.regNo)}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                        ? field.onChange([...(field.value || []), student.regNo])
                                                        : field.onChange(
                                                            field.value?.filter(
                                                                (value) => value !== student.regNo
                                                            )
                                                            )
                                                    }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal w-full">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person" />
                                                                <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-medium">{student.name}</p>
                                                                <p className="text-xs text-muted-foreground">{student.regNo}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </FormLabel>
                                                </FormItem>
                                            )
                                            }}
                                        />
                                        ))}
                                    </FormItem>
                                )}
                            />
                        </div>
                     </ScrollArea>
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                <Save className="mr-2"/> {existingTest ? 'Save Changes' : 'Create Test'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
