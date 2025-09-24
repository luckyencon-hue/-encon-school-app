// src/app/dashboard/cbt/page.tsx
'use client';
import React, { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/user-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, PlusCircle, PenSquare, ChevronRight, UserX, CheckCircle, Send } from 'lucide-react';
import { type CbtTest, type TestStatus } from '@/lib/data';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const TestCard = ({ test, canManageTests, isStudent, onStatusChange, onPublishResults }: { test: CbtTest, canManageTests: boolean, isStudent: boolean, onStatusChange: (testId: string, newStatus: TestStatus) => void, onPublishResults: (testId: string, publish: boolean) => void }) => {
    const { user, studentTestAttempts } = useUser();
    
    const isChiefAdmin = user?.isChiefAdmin;
    const canEditTest = user?.role === 'Admin' || (user?.role === 'Staff' && user.name === test.createdBy);
    const isRestricted = isStudent && test.restrictedStudents?.includes(user!.regNo!);
    const hasAttempted = isStudent && studentTestAttempts.some(a => a.testId === test.id && a.studentRegNo === user!.regNo!);

    return (
        <Card className="hover:shadow-md transition-shadow flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <Badge variant="secondary" className="mb-2">{test.category}</Badge>
                        <CardTitle className="font-headline">{test.title}</CardTitle>
                        <CardDescription>{test.subject} - Created by {test.createdBy}</CardDescription>
                    </div>
                    {canManageTests && isChiefAdmin ? (
                       <Select value={test.status} onValueChange={(value) => onStatusChange(test.id, value as TestStatus)}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Draft">Draft</SelectItem>
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <Badge 
                            variant={test.status === 'Open' ? 'default' : test.status === 'Closed' ? 'destructive' : 'secondary'}
                            className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 data-[variant=destructive]:bg-red-100 data-[variant=destructive]:text-red-800 dark:data-[variant=destructive]:bg-red-900/20 dark:data-[variant=destructive]:text-red-300 data-[variant=secondary]:bg-yellow-100 data-[variant=secondary]:text-yellow-800 dark:data-[variant=secondary]:bg-yellow-900/20 dark:data-[variant=secondary]:text-yellow-300"
                        >
                            {test.status}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="text-sm text-muted-foreground space-y-1">
                    <p>Objectives: {test.objectiveQuestions.length}</p>
                    <p>Essays: {test.essayQuestions.length}</p>
                    {(canManageTests || canEditTest) && (
                        <p className="flex items-center gap-1"><UserX className="h-3 w-3 text-destructive" /> Restricted: {test.restrictedStudents?.length || 0}</p>
                    )}
                </div>
                {canManageTests && isChiefAdmin && (
                     <div className="flex items-center space-x-2 pt-4 border-t">
                        <Switch id={`publish-${test.id}`} checked={test.resultsPublished} onCheckedChange={(checked) => onPublishResults(test.id, checked)} />
                        <Label htmlFor={`publish-${test.id}`} className={test.resultsPublished ? 'text-primary' : ''}>
                            {test.resultsPublished ? 'Results Published' : 'Publish Results'}
                        </Label>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex gap-2">
                {isStudent && (
                     <Button asChild className="w-full" disabled={isRestricted || (test.status !== 'Open' && !hasAttempted) || (hasAttempted && !test.resultsPublished && test.status !== 'Open') }>
                        <Link href={`/dashboard/cbt/take-test/${test.id}`}>
                            {isRestricted 
                                ? 'Access Restricted' 
                                : hasAttempted 
                                ? (test.resultsPublished ? 'View Results' : 'View Submission')
                                : 'Start Test'}
                            {!isRestricted && <ChevronRight className="ml-2" />}
                        </Link>
                    </Button>
                )}
                 {(canManageTests || canEditTest) && (
                     <Button variant="outline" asChild>
                        <Link href={`/dashboard/cbt/create-test?edit=${test.id}`}>
                            <PenSquare className="mr-2 h-4 w-4" /> Edit Test
                        </Link>
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};

export default function CbtPage() {
    const { user, cbtTests, setCbtTests } = useUser();
    const { toast } = useToast();
    
    if (!user) return null;

    const canManageTests = user.role === 'Admin';
    const canCreateTests = user.role === 'Admin' || user.role === 'Staff';
    const isStudent = user.role === 'Student';
    
    const handleStatusChange = useCallback((testId: string, newStatus: TestStatus) => {
        setCbtTests(prev => prev.map(t => t.id === testId ? { ...t, status: newStatus } : t));
    }, [setCbtTests]);

    const handlePublishResults = useCallback((testId: string, publish: boolean) => {
        setCbtTests(prev => prev.map(t => t.id === testId ? { ...t, resultsPublished: publish } : t));
        toast({
            title: publish ? "Results Published" : "Results Hidden",
            description: `Students can ${publish ? 'now' : 'no longer'} view their scores for this test.`,
        });
    }, [setCbtTests, toast]);

    const testsToDisplay = useMemo(() => {
        if (!user || !user.schoolId) return [];
        const allSchoolTests = cbtTests.filter(t => t.schoolId === user.schoolId);

        if (isStudent) {
            return allSchoolTests.filter(t => t.classId === user.classId && (t.status === 'Open' || (t.status === 'Closed' && t.resultsPublished)));
        }
        if (user.role === 'Staff' && !canManageTests) {
            // Staff see tests they created, regardless of status
            return allSchoolTests.filter(t => t.createdBy === user.name);
        }
        // Admins see all tests for the school
        return allSchoolTests;
    }, [cbtTests, isStudent, user, canManageTests]);

    return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">CBT Platform</h1>
          <p className="text-muted-foreground">
            {canCreateTests ? 'Create, manage, and grade computer-based tests.' : 'Take tests and view your results.'}
          </p>
        </div>
        {canCreateTests && (
          <Button asChild>
            <Link href="/dashboard/cbt/create-test">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Test
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
            <CardTitle>
                {isStudent ? "Available Tests" : "Existing Tests"}
            </CardTitle>
            <CardDescription>
                {isStudent ? "Tests that are currently open for you to take or view results." : "View and manage tests for your school."}
            </CardDescription>
        </CardHeader>
        <CardContent>
            {testsToDisplay.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {testsToDisplay.map(test => (
                        <TestCard 
                            key={test.id} 
                            test={test}
                            canManageTests={canManageTests}
                            isStudent={isStudent}
                            onStatusChange={handleStatusChange}
                            onPublishResults={handlePublishResults}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12" />
                    <p className="mt-4 font-semibold">
                        {isStudent ? "No tests are currently available." : "No tests have been created yet."}
                    </p>
                    <p className="text-sm">
                        {isStudent ? "Please check back later." : "Click 'Create New Test' to get started."}
                    </p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
