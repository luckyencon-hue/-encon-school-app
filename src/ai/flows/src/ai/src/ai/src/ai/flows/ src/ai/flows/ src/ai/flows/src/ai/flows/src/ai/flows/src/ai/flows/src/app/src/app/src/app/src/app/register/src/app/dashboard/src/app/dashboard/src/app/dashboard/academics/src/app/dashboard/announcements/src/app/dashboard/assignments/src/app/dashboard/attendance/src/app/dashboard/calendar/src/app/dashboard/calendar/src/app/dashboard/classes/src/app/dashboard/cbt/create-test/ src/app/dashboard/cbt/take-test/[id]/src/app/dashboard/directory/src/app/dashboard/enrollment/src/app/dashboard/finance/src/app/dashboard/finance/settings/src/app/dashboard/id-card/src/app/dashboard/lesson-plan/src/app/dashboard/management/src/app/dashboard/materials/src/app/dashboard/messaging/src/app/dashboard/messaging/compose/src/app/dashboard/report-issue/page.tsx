// src/app/dashboard/report-issue/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessageSquareWarning, Send, ShieldAlert } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const reportSchema = z.object({
  report: z.string().min(20, "Please provide a detailed description of at least 20 characters.").max(1000, "Report cannot exceed 1000 characters."),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export default function ReportIssuePage() {
  const { user, issueReports, setIssueReports } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      report: "",
    },
  });

  useEffect(() => {
    if (!user || user.role !== 'Student') {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'Student') {
    return null;
  }
  
  const isBlocked = user.isBlockedFromReporting;

  const onSubmit = (data: ReportFormValues) => {
    if (!user.regNo) return;

    setIssueReports(prev => [
      ...prev,
      {
        id: `report-${Date.now()}`,
        studentRegNo: user.regNo!,
        studentName: user.name,
        report: data.report,
        date: new Date().toISOString(),
        isResolved: false,
      }
    ]);

    toast({
      title: "Report Submitted",
      description: "Thank you for your feedback. The administration has been notified.",
    });

    form.reset();
    router.push("/dashboard");
  };

  if (isBlocked) {
    return (
       <AlertDialog open={true}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <ShieldAlert className="h-10 w-10 text-destructive mx-auto mb-4" />
                    <AlertDialogTitle>Reporting Function Blocked</AlertDialogTitle>
                    <AlertDialogDescription>
                        Your access to the issue reporting feature has been blocked by the administration due to misuse. Please contact them directly if you have a serious concern.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => router.push('/dashboard')}>Return to Dashboard</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
          <MessageSquareWarning /> Report an Issue
        </h1>
        <p className="text-muted-foreground">
          Have a problem or a suggestion? Let the administration know.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Submit a Report</CardTitle>
          <CardDescription>
            Your report will be sent anonymously to the school administration. Please be respectful and descriptive. This feature is for serious issues only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="report"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Describe the issue or suggestion</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please describe the issue in detail..."
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                <Send className="mr-2 h-4 w-4" />
                Submit Report
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
