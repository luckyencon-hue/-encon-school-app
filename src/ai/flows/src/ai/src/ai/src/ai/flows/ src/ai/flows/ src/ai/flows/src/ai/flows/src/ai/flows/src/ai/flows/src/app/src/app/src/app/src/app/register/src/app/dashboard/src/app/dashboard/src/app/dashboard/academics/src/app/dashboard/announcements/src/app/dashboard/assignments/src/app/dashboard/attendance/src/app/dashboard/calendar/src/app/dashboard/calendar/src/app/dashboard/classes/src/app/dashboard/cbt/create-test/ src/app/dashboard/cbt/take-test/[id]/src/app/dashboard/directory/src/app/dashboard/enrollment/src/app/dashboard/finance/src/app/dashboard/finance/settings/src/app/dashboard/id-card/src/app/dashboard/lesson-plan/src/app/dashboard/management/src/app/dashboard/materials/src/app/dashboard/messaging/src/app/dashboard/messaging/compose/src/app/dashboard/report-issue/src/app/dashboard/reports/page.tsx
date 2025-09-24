// src/app/dashboard/reports/page.tsx
"use client";

import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { IssueReport } from "@/lib/data";
import { useEffect } from "react";

export default function ViewReportsPage() {
  const { user, issueReports, setIssueReports, students, setStudents } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'Admin') {
    return null;
  }
  
  const handleToggleResolve = (reportId: string) => {
    setIssueReports(prev => 
      prev.map(r => r.id === reportId ? { ...r, isResolved: !r.isResolved } : r)
    );
  };

  const handleBlockStudent = (regNo: string, studentName: string) => {
    setStudents(prev => 
      prev.map(s => s.regNo === regNo ? { ...s, isBlockedFromReporting: true } : s)
    );
    toast({
      variant: 'destructive',
      title: 'Student Blocked',
      description: `${studentName} can no longer submit issue reports.`
    })
  };
  
  const handleUnblockStudent = (regNo: string, studentName: string) => {
     setStudents(prev => 
      prev.map(s => s.regNo === regNo ? { ...s, isBlockedFromReporting: false } : s)
    );
     toast({
      title: 'Student Unblocked',
      description: `${studentName} can now submit issue reports again.`
    })
  };

  const getStudent = (regNo: string) => students.find(s => s.regNo === regNo);

  const sortedReports = [...issueReports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Student Reports</h1>
        <p className="text-muted-foreground">
          View and manage issues and suggestions submitted by students.
        </p>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Submitted Reports</CardTitle>
            <CardDescription>
                {sortedReports.length > 0 ? `There are ${sortedReports.length} reports.` : 'No reports have been submitted yet.'}
            </CardDescription>
        </CardHeader>
        <CardContent>
            {sortedReports.length > 0 ? (
                <Accordion type="multiple" className="w-full space-y-4">
                    {sortedReports.map(report => {
                        const student = getStudent(report.studentRegNo);
                        return (
                            <AccordionItem value={report.id} key={report.id} className="border rounded-lg px-4 bg-muted/20">
                                <AccordionTrigger>
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <div className="text-left">
                                            <p className="font-semibold">{report.studentName}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(report.date).toLocaleString()}</p>
                                        </div>
                                        <Badge variant={report.isResolved ? 'default' : 'destructive'} className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 data-[variant=destructive]:bg-yellow-100 data-[variant=destructive]:text-yellow-800 dark:data-[variant=destructive]:bg-yellow-900/20 dark:data-[variant=destructive]:text-yellow-300">
                                          {report.isResolved ? 'Resolved' : 'Pending'}
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4">
                                    <p className="text-base whitespace-pre-wrap">{report.report}</p>
                                    <div className="flex items-center gap-2 pt-4 border-t">
                                        <Button size="sm" onClick={() => handleToggleResolve(report.id)}>
                                            {report.isResolved ? 'Mark as Pending' : 'Mark as Resolved'}
                                        </Button>
                                        {user.isChiefAdmin && student && (
                                           student.isBlockedFromReporting ? (
                                                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleUnblockStudent(student.regNo, student.name)}>
                                                    <ShieldCheck className="mr-2"/> Unblock Student
                                                </Button>
                                           ) : (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="sm" variant="destructive">
                                                          <ShieldX className="mr-2"/> Block Student
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                     <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Block {report.studentName}?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will prevent the student from submitting any more issue reports. This action should only be taken in cases of abuse of the reporting feature. Are you sure?
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleBlockStudent(report.studentRegNo, report.studentName)} className="bg-destructive hover:bg-destructive/90">Yes, Block Student</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                           )
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No reports to show.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
