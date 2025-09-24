// src/app/dashboard/subjects/my-subjects/page.tsx
'use client';

import { useState, useEffect } from "react";
import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { BookMarked, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const subjectSelectionSchema = z.object({
  subjectIds: z.array(z.string()).refine(value => value.length > 0, {
    message: "You must select at least one subject.",
  }),
});

type SubjectSelectionForm = z.infer<typeof subjectSelectionSchema>;

export default function MySubjectsPage() {
  const { user, setUser, subjects, schoolClasses, setStudents } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || user.role !== 'Student') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const studentClass = schoolClasses.find(c => c.id === user?.classId);
  const offeredSubjectIds = studentClass?.offeredSubjects || [];
  const availableSubjects = subjects.filter(s => offeredSubjectIds.includes(s.id) && s.schoolId === user?.schoolId);
  
  const hasSelectedSubjects = user?.offeredSubjects && user.offeredSubjects.length > 0;

  const form = useForm<SubjectSelectionForm>({
    resolver: zodResolver(subjectSelectionSchema),
    defaultValues: {
      subjectIds: user?.offeredSubjects || [],
    },
  });
  
  // Set default values once available subjects are loaded
   useEffect(() => {
    if (availableSubjects.length > 0 && !hasSelectedSubjects) {
      form.reset({
        // By default, select all available subjects for the class
        subjectIds: availableSubjects.map(s => s.id),
      });
    } else if (hasSelectedSubjects) {
      form.reset({ subjectIds: user.offeredSubjects });
    }
   }, [availableSubjects, form, hasSelectedSubjects, user?.offeredSubjects]);

  const onSubmit = (data: SubjectSelectionForm) => {
    if (!user) return;
    const updatedUser = { ...user, offeredSubjects: data.subjectIds };
    setUser(updatedUser);
    setStudents(prev => prev.map(s => s.regNo === user.regNo ? updatedUser : s));
    
    toast({
      title: "Subjects Saved",
      description: "Your subject selection has been updated successfully.",
    });
  };

  if (!user || user.role !== 'Student') {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
            <BookMarked /> My Subjects
        </h1>
        <p className="text-muted-foreground">
          Select the subjects you will be offering for this academic session.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Subject Selection for {studentClass?.name}</CardTitle>
              <CardDescription>
                {hasSelectedSubjects 
                    ? "Your subject selection is locked. Contact administration for changes." 
                    : "Choose your subjects from the list below."
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
               <FormField
                control={form.control}
                name="subjectIds"
                render={() => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base">Available Subjects</FormLabel>
                    {availableSubjects.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {availableSubjects.map((subject) => (
                            <FormField
                                key={subject.id}
                                control={form.control}
                                name="subjectIds"
                                render={({ field }) => {
                                return (
                                    <FormItem
                                    key={subject.id}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                    >
                                    <FormControl>
                                        <Checkbox
                                          disabled={hasSelectedSubjects}
                                          checked={field.value?.includes(subject.id)}
                                          onCheckedChange={(checked) => {
                                              return checked
                                              ? field.onChange([...(field.value || []), subject.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                      (value) => value !== subject.id
                                                  )
                                                  );
                                          }}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal">{subject.name}</FormLabel>
                                    </FormItem>
                                );
                                }}
                            />
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No subjects have been assigned to your class yet. Please check back later.</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {!hasSelectedSubjects && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full" disabled={availableSubjects.length === 0}>
                         <Save className="mr-2 h-4 w-4" /> Save Selection
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will lock your subject selection. You will need to contact the school administration to make any further changes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={form.handleSubmit(onSubmit)}>
                          Yes, Save and Lock
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              )}

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
