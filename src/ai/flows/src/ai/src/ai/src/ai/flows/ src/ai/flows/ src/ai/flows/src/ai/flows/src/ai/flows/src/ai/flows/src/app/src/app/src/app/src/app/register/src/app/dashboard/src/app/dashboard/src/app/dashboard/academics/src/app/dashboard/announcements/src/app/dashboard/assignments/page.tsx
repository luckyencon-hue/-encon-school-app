// src/app/dashboard/assignments/page.tsx
"use client";

import { useState, useMemo } from 'react';
import { useUser } from '@/context/user-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, BookCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, isPast, differenceInDays, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Assignment } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import MarkdownRenderer from '@/components/markdown-renderer';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';

const assignmentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(10, 'Please provide a detailed description.'),
  subject: z.string().min(1, 'Please select a subject.'),
  classId: z.string().min(1, 'Please select a class.'),
  dueDate: z.date({ required_error: 'A due date is required.' }),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

const AssignmentForm = ({ onAddAssignment, isSubmitting }: { onAddAssignment: (data: AssignmentFormValues) => void, isSubmitting: boolean }) => {
  const { user, schoolClasses, subjects } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: '',
      description: '',
      subject: '',
      classId: '',
    },
  });
  
  const selectedClassId = form.watch('classId');

  const availableSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    const selectedClass = schoolClasses.find(c => c.id === selectedClassId);
    if (!selectedClass || !selectedClass.offeredSubjects) return [];
    return subjects.filter(s => selectedClass.offeredSubjects?.includes(s.id));
  }, [selectedClassId, schoolClasses, subjects]);

  const onSubmit = (data: AssignmentFormValues) => {
    onAddAssignment(data);
    form.reset();
    setIsOpen(false);
  };
  
  const mySchoolClasses = schoolClasses.filter(c => c.schoolId === user?.schoolId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button><PlusCircle className="mr-2"/> New Assignment</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">Create New Assignment</DialogTitle>
          <DialogDescription>Fill out the details below to post a new assignment for a class.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
                 <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Photosynthesis Lab Report" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Provide detailed instructions for the assignment..." className="min-h-[150px]" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                     <FormField control={form.control} name="dueDate" render={({ field }) => (
                        <FormItem className="flex flex-col pt-2"><FormLabel>Due Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                                </PopoverContent>
                            </Popover><FormMessage />
                        </FormItem>
                    )}/>
                </div>
                <DialogFooter className="pt-4">
                    <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                        Create Assignment
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

const DueDateBadge = ({ dueDate }: { dueDate: string }) => {
    const date = new Date(dueDate);
    const diff = differenceInDays(date, new Date());
    
    if (isPast(date) && !isToday(date)) {
        return <Badge variant="destructive">Overdue</Badge>;
    }
    if (isToday(date)) {
        return <Badge variant="destructive" className="bg-orange-500 text-white">Due Today</Badge>;
    }
    if (diff < 7) {
        return <Badge variant="secondary" className="bg-yellow-400 text-black">Due in {diff + 1} day(s)</Badge>;
    }
    return <Badge variant="secondary">Due {format(date, "MMM dd")}</Badge>
}

export default function AssignmentsPage() {
    const { user, assignments, setAssignments, schoolClasses } = useUser();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canCreate = user?.role === 'Admin' || user?.role === 'Staff';
  
    const myAssignments = useMemo(() => {
        if (!user) return [];
        const userSchoolId = user.schoolId;
        const schoolAssignments = assignments.filter(a => a.schoolId === userSchoolId);
        if (user.role === 'Admin' || user.role === 'Staff') return schoolAssignments;
        
        if (user.role === 'Student' || user.role === 'Parent') {
             const studentClassId = user.classId;
             if (!studentClassId) return [];
             return schoolAssignments.filter(a => a.classId === studentClassId);
        }
        return [];
    }, [user, assignments]);

    const handleAddAssignment = async (data: AssignmentFormValues) => {
        if (!user || !user.schoolId) return;
        setIsSubmitting(true);
        try {
            const newAssignment: Omit<Assignment, 'id'> = {
                ...data,
                dueDate: data.dueDate.toISOString(),
                createdBy: user.name,
                schoolId: user.schoolId,
            };
            const docRef = await addDoc(collection(db, "assignments"), newAssignment);
            setAssignments(prev => [{id: docRef.id, ...newAssignment } as Assignment, ...prev].sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()));
            toast({ title: "Assignment Posted", description: `The assignment "${data.title}" has been posted.`});
        } catch(error) {
            console.error("Error adding assignment:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not post the assignment.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveAssignment = async (id: string) => {
        setIsSubmitting(true);
        try {
            await deleteDoc(doc(db, "assignments", id));
            setAssignments(prev => prev.filter(a => a.id !== id));
            toast({ title: "Assignment Removed" });
        } catch(error) {
            console.error("Error removing assignment:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the assignment.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2"><BookCheck /> Assignments</h1>
                    <p className="text-muted-foreground">
                        {canCreate ? "Manage and create assignments for your classes." : "View your assignments and due dates."}
                    </p>
                </div>
                {canCreate && <AssignmentForm onAddAssignment={handleAddAssignment} isSubmitting={isSubmitting} />}
            </div>
            
            <div className="space-y-6">
                {myAssignments.length > 0 ? (
                    myAssignments.map(assignment => (
                         <Card key={assignment.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline">{schoolClasses.find(c => c.id === assignment.classId)?.name || 'Unknown Class'}</Badge>
                                            <Badge variant="outline">{assignment.subject}</Badge>
                                        </div>
                                        <CardTitle className="font-headline">{assignment.title}</CardTitle>
                                        <CardDescription>
                                            Posted by {assignment.createdBy}
                                        </CardDescription>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <DueDateBadge dueDate={assignment.dueDate} />
                                        <p className="text-xs text-muted-foreground mt-1">{new Date(assignment.dueDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <MarkdownRenderer content={assignment.description} />
                                {canCreate && assignment.createdBy === user?.name && (
                                    <div className="mt-4 pt-4 border-t">
                                        <Button variant="destructive" size="sm" onClick={() => handleRemoveAssignment(assignment.id)} disabled={isSubmitting}>
                                            {isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <Trash2 className="mr-2"/>} Remove Assignment
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <BookCheck className="mx-auto h-12 w-12 mb-4" />
                            <h3 className="font-semibold">No Assignments Here</h3>
                            <p>
                                {canCreate ? "You haven't created any assignments yet." : "You have no pending assignments. Great job!"}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
