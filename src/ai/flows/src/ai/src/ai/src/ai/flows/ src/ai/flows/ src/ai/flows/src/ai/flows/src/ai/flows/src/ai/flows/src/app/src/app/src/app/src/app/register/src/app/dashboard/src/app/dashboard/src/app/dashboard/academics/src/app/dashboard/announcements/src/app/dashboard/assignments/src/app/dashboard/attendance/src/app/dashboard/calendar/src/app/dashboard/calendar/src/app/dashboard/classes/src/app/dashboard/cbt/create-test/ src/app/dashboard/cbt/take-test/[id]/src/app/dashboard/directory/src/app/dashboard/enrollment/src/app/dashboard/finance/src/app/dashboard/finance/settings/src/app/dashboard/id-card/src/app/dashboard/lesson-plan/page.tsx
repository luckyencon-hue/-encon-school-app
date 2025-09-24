// src/app/dashboard/lesson-plan/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Sparkles, Loader2, BookOpen, Youtube, Link as LinkIcon, Send, BookCopy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateLessonPlan, type GenerateLessonPlanOutput } from '@/ai/flows/generate-lesson-plan-flow';
import MarkdownRenderer from '@/components/markdown-renderer';
import type { LearningMaterial } from '@/lib/data';

const lessonPlanSchema = z.object({
  subject: z.string().min(1, 'Please select a subject.'),
  classId: z.string().min(1, 'Please select a class.'),
  topic: z.string().min(3, 'Topic must be at least 3 characters long.'),
  week: z.coerce.number().min(1, 'Week number must be at least 1.').max(15, 'Week number cannot exceed 15.'),
  objectives: z.string().optional(),
});

type LessonPlanFormValues = z.infer<typeof lessonPlanSchema>;

const DRAFT_STORAGE_KEY = 'lesson-plan-draft';

export default function LessonPlanPage() {
  const { user, schoolClasses, subjects, setLearningMaterials } = useUser();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GenerateLessonPlanOutput | null>(null);
  const [editableLessonPlan, setEditableLessonPlan] = useState('');
  const [editableLessonNote, setEditableLessonNote] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isNotePosted, setIsNotePosted] = useState(false);

  const form = useForm<LessonPlanFormValues>({
    resolver: zodResolver(lessonPlanSchema),
    defaultValues: {
      topic: '',
      week: 1,
      objectives: '',
    },
  });

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        form.reset(draftData);
      } catch (e) {
        console.error("Failed to parse lesson plan draft", e);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }
  }, [form]);

  // Save form data to localStorage on change
  useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form.watch, form]);
  
  useEffect(() => {
    if (generatedContent) {
      setEditableLessonPlan(generatedContent.lessonPlan);
      setEditableLessonNote(generatedContent.lessonNote);
    }
  }, [generatedContent]);

  const selectedClassId = form.watch('classId');

  const availableSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    const selectedClass = schoolClasses.find(c => c.id === selectedClassId);
    if (!selectedClass || !selectedClass.offeredSubjects) return [];
    return subjects.filter(s => selectedClass.offeredSubjects?.includes(s.id));
  }, [selectedClassId, schoolClasses, subjects]);

  const onSubmit = async (data: LessonPlanFormValues) => {
    setIsGenerating(true);
    setGeneratedContent(null);
    setIsSubmitted(false);
    setIsNotePosted(false);
    try {
      const result = await generateLessonPlan({
        ...data,
        className: schoolClasses.find(c => c.id === data.classId)?.name || '',
      });
      setGeneratedContent(result);
      toast({
        title: 'Generation Complete',
        description: 'Your lesson plan and note have been generated successfully.',
      });
      localStorage.removeItem(DRAFT_STORAGE_KEY); // Clear draft after successful generation
    } catch (error) {
      console.error('Lesson plan generation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'The AI could not generate the lesson plan. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSubmitToAdmin = () => {
    // In a real app, this would send the 'editable' content to a backend.
    setIsSubmitted(true);
    toast({
        title: "Lesson Plan Submitted",
        description: "Your lesson plan has been sent to the administration for review."
    });
  }

  const handlePostNoteToStudents = () => {
    if (!generatedContent || !user) return;
    
    const newMaterial: LearningMaterial = {
      id: `mat-${Date.now()}`,
      title: `Lesson Note: ${generatedContent.topic}`,
      subject: form.getValues('subject'),
      classId: form.getValues('classId'),
      type: 'document',
      content: editableLessonNote, // Use the editable note
      uploadedBy: user.name,
      date: new Date().toISOString(),
      schoolId: user.schoolId!,
    };

    setLearningMaterials(prev => [newMaterial, ...prev]);
    setIsNotePosted(true);
    toast({
        title: "Note Posted",
        description: `The lesson note for "${generatedContent.topic}" is now available to students.`
    });
  };

  if (!user || (user.role !== 'Admin' && user.role !== 'Staff')) {
    // Redirect or show access denied message
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You do not have permission to view this page.</p>
        </CardContent>
      </Card>
    );
  }

  const mySchoolClasses = schoolClasses.filter(c => c.schoolId === user?.schoolId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
          <ClipboardList /> AI Lesson Plan Generator
        </h1>
        <p className="text-muted-foreground">
          Generate weekly lesson plans and detailed notes for your classes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Lesson Details</CardTitle>
              <CardDescription>Provide the details for the lesson you want to plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                   <FormField control={form.control} name="classId" render={({ field }) => (
                    <FormItem><FormLabel>Class</FormLabel>
                        <Select onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('subject', ''); // Reset subject when class changes
                        }} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger></FormControl>
                            <SelectContent>{mySchoolClasses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                    </FormItem>
                  )}/>
                   <FormField control={form.control} name="subject" render={({ field }) => (
                    <FormItem><FormLabel>Subject</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedClassId || availableSubjects.length === 0}>
                            <FormControl><SelectTrigger><SelectValue placeholder={!selectedClassId ? "Select a class first" : "Select Subject"} /></SelectTrigger></FormControl>
                            <SelectContent>{availableSubjects.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={form.control} name="week" render={({ field }) => (
                    <FormItem><FormLabel>Week</FormLabel><FormControl><Input type="number" min="1" max="15" placeholder="e.g., 1" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="topic" render={({ field }) => (
                    <FormItem><FormLabel>Topic</FormLabel><FormControl><Input placeholder="e.g., The Solar System" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="objectives" render={({ field }) => (
                    <FormItem><FormLabel>Learning Objectives (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., By the end of the lesson, students should be able to list the planets..." {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <Button type="submit" className="w-full" disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles className="mr-2"/>}
                    Generate Lesson Plan
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card className="min-h-[500px]">
            <CardHeader>
              <CardTitle>Generated Content</CardTitle>
              <CardDescription>Your lesson plan and notes will appear here. You can edit them before submitting.</CardDescription>
            </CardHeader>
            <CardContent>
              {isGenerating && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p>The AI is preparing your lesson plan...</p>
                </div>
              )}
              {generatedContent ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-xl font-headline mb-2">Lesson Plan: {generatedContent.topic}</h3>
                    <Textarea
                      value={editableLessonPlan}
                      onChange={(e) => setEditableLessonPlan(e.target.value)}
                      className="min-h-[250px] w-full font-mono text-xs"
                      placeholder="Editable lesson plan..."
                    />
                  </div>
                   <div>
                    <h3 className="font-bold text-xl font-headline mb-2 flex items-center gap-2"><BookOpen /> Lesson Note</h3>
                     <Textarea
                        value={editableLessonNote}
                        onChange={(e) => setEditableLessonNote(e.target.value)}
                        className="min-h-[250px] w-full"
                        placeholder="Editable lesson note..."
                      />
                  </div>
                  <div>
                     <h3 className="font-bold text-xl font-headline mb-2">Suggested Materials</h3>
                     <div className="space-y-3">
                        {generatedContent.suggestedMaterials?.map((material, index) => (
                            <a key={index} href={material.url} target="_blank" rel="noopener noreferrer" className="block p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    {material.type === 'video' ? <Youtube className="h-5 w-5 text-red-500"/> : <LinkIcon className="h-5 w-5"/>}
                                    <div>
                                        <p className="font-semibold text-primary">{material.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{material.url}</p>
                                    </div>
                                </div>
                            </a>
                        ))}
                     </div>
                  </div>
                   <div className="pt-6 border-t flex flex-col sm:flex-row gap-2">
                        <Button onClick={handleSubmitToAdmin} disabled={isSubmitted} className="w-full">
                            <Send className="mr-2"/>
                            {isSubmitted ? 'Submitted to Admin' : 'Submit to Admin'}
                        </Button>
                         <Button onClick={handlePostNoteToStudents} disabled={isNotePosted} variant="secondary" className="w-full">
                            <BookCopy className="mr-2"/>
                            {isNotePosted ? 'Note Posted to Students' : 'Post Note to Students'}
                        </Button>
                    </div>
                </div>
              ) : (
                !isGenerating && (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <ClipboardList className="h-12 w-12 mb-4" />
                        <p>Fill out the form to generate your content.</p>
                    </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
