// src/app/dashboard/classes/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle, Trash2, Building2, Edit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SchoolClass, SchoolCategory } from '@/lib/data';
import { db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc } from "firebase/firestore";

const classSchema = z.object({
  name: z.string().min(2, 'Class name must be at least 2 characters.'),
  category: z.enum(['nursery', 'primary', 'upperBasic', 'highSchool'], { required_error: 'Please select a category.' }),
  teacher: z.string().optional(),
});

type ClassFormValues = z.infer<typeof classSchema>;

export default function ClassesPage() {
  const { user, schoolClasses, setSchoolClasses, staff } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: '',
      teacher: '',
    },
  });

  useEffect(() => {
    if (!user || user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'Admin') {
    return null;
  }

  const schoolStaff = staff.filter(t => t.schoolId === user.schoolId);
  const mySchoolClasses = schoolClasses.filter(c => c.schoolId === user?.schoolId);
  
  const handleEditClick = (classToEdit: SchoolClass) => {
    setEditingClass(classToEdit);
    form.reset({
        name: classToEdit.name,
        category: classToEdit.category,
        teacher: classToEdit.teacher || '',
    });
     window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingClass(null);
    form.reset({ name: '', teacher: '', category: undefined });
  };

  const onSubmit = async (data: ClassFormValues) => {
    if (!user.schoolId) return;
    setIsSubmitting(true);
    
    try {
        const finalData = {
            ...data,
            teacher: data.teacher === 'unassigned' ? '' : data.teacher,
        };

        if (editingClass) {
            const classToUpdate: SchoolClass = { ...editingClass, ...finalData, teacher: finalData.teacher || '' };
            await setDoc(doc(db, "schoolClasses", editingClass.id), classToUpdate);
            setSchoolClasses(prev => prev.map(c => c.id === editingClass.id ? classToUpdate : c));
            toast({ title: 'Class Updated', description: `Class "${data.name}" has been updated.` });
            handleCancelEdit();
        } else {
            const classId = `class-${user.schoolId}-${Date.now()}`;
            const newClass: SchoolClass = {
              id: classId,
              schoolId: user.schoolId!,
              name: data.name,
              category: data.category,
              teacher: finalData.teacher || '',
              students: [],
              offeredSubjects: [],
            };
            await setDoc(doc(db, "schoolClasses", classId), newClass);
            setSchoolClasses(prev => [...prev, newClass]);
            toast({ title: 'Class Added', description: `Class "${data.name}" has been created.` });
            form.reset({ name: '', teacher: '', category: undefined });
        }
    } catch (error) {
        console.error("Error saving class:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save class.'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRemoveClass = async (classId: string) => {
    const classToRemove = schoolClasses.find(c => c.id === classId);
    if (classToRemove?.students.length ?? 0 > 0) {
        toast({ variant: 'destructive', title: 'Cannot Remove Class', description: 'You cannot remove a class that has students enrolled in it.' });
        return;
    }
    
    setIsSubmitting(true);
    try {
        await deleteDoc(doc(db, "schoolClasses", classId));
        setSchoolClasses(prev => prev.filter(c => c.id !== classId));
        toast({ title: 'Class Removed' });
    } catch (error) {
        console.error("Error removing class:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not remove class.'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const formatCategory = (category: SchoolCategory) => {
    if (category === 'highSchool') return 'High School';
    if (category === 'upperBasic') return 'Upper Basic';
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2"><Building2 /> Class Management</h1>
        <p className="text-muted-foreground">Add, view, and manage classes for your school.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{editingClass ? `Editing: ${editingClass.name}`: 'Add New Class'}</CardTitle>
              <CardDescription>{editingClass ? 'Update the details for this class.' : 'Create a new class for your school.'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Name</FormLabel>
                      <FormControl><Input placeholder="e.g., JSS 1A, Basic 6 Gold" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="nursery">Nursery School</SelectItem>
                          <SelectItem value="primary">Primary School</SelectItem>
                          <SelectItem value="upperBasic">Upper Basic</SelectItem>
                          <SelectItem value="highSchool">High School</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="teacher" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Form Teacher (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Assign a staff member" /></SelectTrigger></FormControl>
                        <SelectContent>
                           <SelectItem value="unassigned">Unassigned</SelectItem>
                          {schoolStaff.map(t => <SelectItem key={t.email} value={t.name}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex flex-col gap-2">
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : editingClass ? <Edit className="mr-2" /> : <PlusCircle className="mr-2" />}
                        {editingClass ? 'Save Changes' : 'Add Class'}
                    </Button>
                    {editingClass && (
                        <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel Edit</Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Existing Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Form Teacher</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mySchoolClasses.length > 0 ? (
                    mySchoolClasses.map(sc => (
                      <TableRow key={sc.id}>
                        <TableCell className="font-medium">{sc.name}</TableCell>
                        <TableCell>{formatCategory(sc.category)}</TableCell>
                        <TableCell>{sc.teacher || 'Unassigned'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="icon" className="h-8 w-8 mr-2" onClick={() => handleEditClick(sc)} disabled={isSubmitting}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveClass(sc.id)} disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No classes have been added yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
