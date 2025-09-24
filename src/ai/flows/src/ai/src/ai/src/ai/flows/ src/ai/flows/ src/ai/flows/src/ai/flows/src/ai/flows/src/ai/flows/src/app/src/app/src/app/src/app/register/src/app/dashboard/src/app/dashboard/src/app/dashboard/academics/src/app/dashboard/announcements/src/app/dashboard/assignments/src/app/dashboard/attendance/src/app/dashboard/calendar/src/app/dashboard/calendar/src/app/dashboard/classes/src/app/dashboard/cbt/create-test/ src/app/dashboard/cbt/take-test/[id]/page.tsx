// src/app/dashboard/cbt/take-test/[id]/page.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/context/user-context';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, ShieldAlert, BookOpen, Clock } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { gradeEssay } from '@/ai/flows/grade-essay-flow';
import type { CbtTest, StudentTestAttempt, Grade } from '@/lib/data';

type TestFormValues = {
    objectiveAnswers: Record<string, string>;
    essayAnswers: Record<string, string>;
}

const CountdownTimer = ({ expiryTimestamp, onExpire }: { expiryTimestamp: number; onExpire: () => void }) => {
    const [timeLeft, setTimeLeft] = useState(expiryTimestamp - Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            const newTimeLeft = expiryTimestamp - Date.now();
            if (newTimeLeft <= 0) {
                clearInterval(interval);
                onExpire();
            } else {
                setTimeLeft(newTimeLeft);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiryTimestamp, onExpire]);

    const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);

    return (
        <div className="flex items-center font-mono text-lg font-semibold">
            <Clock className="mr-2 h-5 w-5" />
            <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
        </div>
    );
};

export default function TakeTestPage() {
    const router = useRouter();
    const params = useParams();
    const testId = params.id as string;
    const { user, cbtTests, studentTestAttempts, setStudentTestAttempts } = useUser();
    const [test, setTest] = useState<CbtTest | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        const foundTest = cbtTests.find(t => t.id === testId);
        if (foundTest) {
            setTest(foundTest);
        } else {
            router.push('/dashboard/cbt');
        }
    }, [testId, cbtTests, router]);
    
    const form = useForm<TestFormValues>({
        defaultValues: {
            objectiveAnswers: {},
            essayAnswers: {}
        }
    });

    const attempt = useMemo(() => {
        if(!user || !user.regNo) return undefined;
        return studentTestAttempts.find(a => a.studentRegNo === user.regNo && a.testId === testId);
    }, [user, testId, studentTestAttempts]);
    
    const startTime = useMemo(() => {
        if (!test) return null;
        const now = Date.now();
        // If an attempt exists, use its start time, otherwise, use now.
        // This prevents the timer from resetting on re-renders.
        const existingStartTime = attempt?.startTime;
        return existingStartTime ? new Date(existingStartTime).getTime() : now;
    }, [test, attempt]);

    const endTime = useMemo(() => {
        if (!startTime || !test?.duration) return null;
        return startTime + test.duration * 60 * 1000;
    }, [startTime, test?.duration]);


    const isRestricted = useMemo(() => {
        if (!user || !test || !user.regNo) return false;
        return test.restrictedStudents?.includes(user.regNo) || false;
    }, [user, test]);


    const handleAutoSubmit = () => {
        if (formRef.current) {
            // Trigger form submission programmatically
            form.handleSubmit(onSubmit)();
        }
    };


    if (!user || user.role !== 'Student') {
        router.push('/dashboard');
        return null;
    }

    if (!test) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }
    
    if (isRestricted) {
         return (
            <AlertDialog open={true}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <ShieldAlert className="h-10 w-10 text-destructive mx-auto mb-4" />
                        <AlertDialogTitle>Access Restricted</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are not permitted to take this test. This may be due to outstanding fees, suspension, or other administrative reasons. Please contact the school administration for more information.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => router.push('/dashboard/cbt')}>Back to CBT Platform</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }
    
    if (attempt && test.resultsPublished) {
        // Show results view
        const totalObjectiveMarks = test.objectiveQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
        const totalEssayMarks = test.essayQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
        const totalTestMarks = totalObjectiveMarks + totalEssayMarks;
        const totalEssayScore = Object.values(attempt.essayScores).reduce((acc, s) => acc + s.score, 0);

        return (
             <div className="space-y-8 max-w-4xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl">{test.title} - Results</CardTitle>
                        <CardDescription>{test.subject} - {test.category}</CardDescription>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Your Score</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                            <span className="font-medium">Objective Score</span>
                            <span className="font-bold text-2xl">{attempt.objectiveScore} / {totalObjectiveMarks}</span>
                        </div>
                        {totalEssayMarks > 0 && (
                             <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                                <span className="font-medium">Total Essay Score</span>
                                <span className="font-bold text-2xl">{totalEssayScore} / {totalEssayMarks}</span>
                            </div>
                        )}
                         <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                            <span className="font-medium text-primary">Final Recorded Score</span>
                            <span className="font-bold text-2xl text-primary">{attempt.totalScore.toFixed(2)}%</span>
                        </div>
                    </CardContent>
                </Card>
                 {test.essayQuestions.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle>Essay Feedback</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {test.essayQuestions.map(q => (
                                <div key={q.id} className="p-3 border rounded-md">
                                    <p className="font-semibold">{q.question} ({q.marks} marks)</p>
                                    <p className="text-sm my-2 p-3 bg-muted rounded-md italic">Your Answer: {attempt.essayAnswers[q.id] || "No answer"}</p>
                                    <p className="text-sm my-2 p-3 bg-green-500/10 rounded-md">Feedback: {attempt.essayScores[q.id]?.feedback || "Not graded"}</p>
                                    <p className="text-sm font-semibold p-3 bg-blue-500/10 rounded-md">Score: {attempt.essayScores[q.id]?.score || 0} / {q.marks}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                 )}

                 <Button onClick={() => router.push('/dashboard/cbt')}><BookOpen className="mr-2"/> Back to CBT Platform</Button>
            </div>
        )
    }

    if (attempt && !test.resultsPublished) {
         return (
            <AlertDialog open={true}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Test Already Submitted</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have completed this test. Results are not yet published. Please check back later.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => router.push('/dashboard/cbt')}>Back to CBT Platform</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    const onSubmit = async (data: TestFormValues) => {
        if (!test || !user.regNo || isSubmitting) return;
        setIsSubmitting(true);

        // --- Calculate Objective Score ---
        let objectiveScore = 0;
        test.objectiveQuestions.forEach(q => {
            if (data.objectiveAnswers[q.id] === q.correctAnswer) {
                objectiveScore += (q.marks || 1);
            }
        });
        
        // --- Grade Essays with AI ---
        const essayScores: Record<string, { score: number; feedback: string }> = {};
        for (const essay of test.essayQuestions) {
            const studentAnswer = data.essayAnswers[essay.id];
            if (studentAnswer) {
                try {
                    const result = await gradeEssay({
                        question: essay.question,
                        markingRubric: `${essay.markingRubric}\n\nThe total marks for this question is ${essay.marks}.`,
                        studentAnswer: studentAnswer,
                    });
                    // Clamp the score to be within the max marks for the question
                    const gradedScore = Math.max(0, Math.min(result.score, essay.marks || 10));
                    essayScores[essay.id] = { score: gradedScore, feedback: result.feedback };
                } catch(e) {
                     essayScores[essay.id] = { score: 0, feedback: 'AI grading failed. A staff member will review.' };
                }
            } else {
                 essayScores[essay.id] = { score: 0, feedback: 'No answer submitted.' };
            }
        }
        
        // --- Calculate Total Score based on test category ---
        const totalEssayScore = Object.values(essayScores).reduce((acc, s) => acc + s.score, 0);
        const totalObjectiveMarks = test.objectiveQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
        const totalEssayMarks = test.essayQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
        const totalTestMarks = totalObjectiveMarks + totalEssayMarks;
        
        let totalScore = 0;
        if (totalTestMarks > 0) {
            totalScore = ((objectiveScore + totalEssayScore) / totalTestMarks) * 100;
        }

        // --- Create Student Attempt Record ---
        const newAttempt: StudentTestAttempt = {
            studentRegNo: user.regNo,
            testId: test.id,
            startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
            endTime: new Date().toISOString(),
            objectiveAnswers: data.objectiveAnswers,
            essayAnswers: data.essayAnswers,
            objectiveScore,
            essayScores,
            totalScore: parseFloat(totalScore.toFixed(2)),
            dateTaken: new Date().toISOString(),
        }
        setStudentTestAttempts(prev => [...prev, newAttempt]);

        setIsSubmitting(false);
        setShowSuccessDialog(true);
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
             <AlertDialog open={showSuccessDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Test Submitted Successfully!</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your answers have been submitted. You will be notified when your results are published by your form teacher.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => router.push('/dashboard/cbt')}>Return to CBT Platform</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

             <Card className="sticky top-0 z-10">
                <CardHeader className="flex flex-row items-center justify-between p-4">
                    <div>
                        <CardTitle className="font-headline text-xl">{test.title}</CardTitle>
                        <CardDescription>{test.subject} - {test.category}</CardDescription>
                    </div>
                    {endTime && (
                        <div className="p-2 bg-muted rounded-lg">
                           <CountdownTimer expiryTimestamp={endTime} onExpire={handleAutoSubmit} />
                        </div>
                    )}
                </CardHeader>
            </Card>

            <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {test.objectiveQuestions.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Objective Questions</CardTitle>
                            <CardDescription>Select one answer for each question.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {test.objectiveQuestions.map((q, index) => (
                                <div key={q.id} className="p-4 border rounded-md">
                                    <p className="font-semibold mb-2">{index + 1}. {q.question} ({q.marks} mark(s))</p>
                                    <Controller
                                        name={`objectiveAnswers.${q.id}`}
                                        control={form.control}
                                        render={({ field }) => (
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2">
                                                {q.options.map((option, optIndex) => (
                                                    <div key={optIndex} className="flex items-center space-x-2">
                                                        <RadioGroupItem value={option} id={`${q.id}-${optIndex}`} />
                                                        <Label htmlFor={`${q.id}-${optIndex}`}>{option}</Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        )}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {test.essayQuestions.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Essay Questions</CardTitle>
                            <CardDescription>Write your answers in the textboxes provided. Answer all questions unless otherwise stated.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {test.essayQuestions.map((q, index) => (
                                <div key={q.id} className="p-4 border rounded-md">
                                    <Label className="font-semibold text-base">{index + 1}. {q.question} ({q.marks} mark(s))</Label>
                                     <Controller
                                        name={`essayAnswers.${q.id}`}
                                        control={form.control}
                                        render={({ field }) => (
                                            <Textarea placeholder="Type your answer here..." className="mt-2 min-h-[150px]" {...field} />
                                        )}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                    Submit Test
                </Button>
            </form>
        </div>
    );
}
