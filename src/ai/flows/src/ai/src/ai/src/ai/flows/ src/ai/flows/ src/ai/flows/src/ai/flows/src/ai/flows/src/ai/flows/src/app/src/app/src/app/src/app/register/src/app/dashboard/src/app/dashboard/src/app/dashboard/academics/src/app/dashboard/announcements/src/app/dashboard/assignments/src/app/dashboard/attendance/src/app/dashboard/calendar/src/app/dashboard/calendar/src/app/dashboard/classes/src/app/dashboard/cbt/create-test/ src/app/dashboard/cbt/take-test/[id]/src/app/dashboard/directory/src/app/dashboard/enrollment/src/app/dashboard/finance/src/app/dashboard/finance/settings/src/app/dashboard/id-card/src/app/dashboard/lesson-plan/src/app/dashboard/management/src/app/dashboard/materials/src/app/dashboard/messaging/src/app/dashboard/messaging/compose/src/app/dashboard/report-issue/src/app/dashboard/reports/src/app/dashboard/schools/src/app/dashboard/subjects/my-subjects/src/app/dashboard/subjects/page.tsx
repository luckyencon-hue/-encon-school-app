// src/app/dashboard/subjects/page.tsx
'use client';

import { useUser } from '@/context/user-context';
import { useRouter } from 'next/navigation';
import MySubjectsPage from './my-subjects/page';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, BookMarked, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Subject, SchoolClass, SchoolCategory } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

const newSubjectSchema = {
    name: '',
    category: '' as SchoolCategory | '',
};

export default function SubjectsPage() {
    const { user, subjects, setSubjects, schoolClasses, setSchoolClasses } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [newSubject, setNewSubject] = useState(newSubjectSchema);
    const [selectedCategory, setSelectedCategory] = useState<SchoolCategory | 'all'>('all');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
      if (!user) {
          router.push('/dashboard');
      } else if (user.role !== 'Student' && user.role !== 'Admin') {
          router.push('/dashboard');
      }
    }, [user, router]);


    if (!user) {
        return null;
    }

    if (user.role === 'Student') {
        return <MySubjectsPage />;
    }

    if (user.role !== 'Admin') {
        return null;
    }

    const schoolSubjects = subjects.filter(s => s.schoolId === user.schoolId);
    const mySchoolClasses = schoolClasses.filter(c => c.schoolId === user?.schoolId);

    const handleAddSubject = async () => {
        if (!newSubject.name.trim()) {
            toast({ variant: 'destructive', title: 'Subject name cannot be empty.' });
            return;
        }
        if (!newSubject.category) {
            toast({ variant: 'destructive', title: 'Please select a category.' });
            return;
        }
        if (!user.schoolId) return;

        setIsSubmitting(true);
        await new Promise(res => setTimeout(res, 500));
        try {
            const subjectId = `subj-${Date.now()}`;
            const newSubjectData: Subject = {
                id: subjectId,
                name: newSubject.name.trim(),
                schoolId: user.schoolId!,
                category: newSubject.category,
            };
            setSubjects(prev => [...prev, newSubjectData]);
            setNewSubject({ name: '', category: '' });
            toast({ title: 'Subject Added', description: `"${newSubjectData.name}" has been added.` });
        } catch(error) {
             console.error("Error adding subject:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not add subject.'});
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveSubject = async (subjectId: string) => {
        setIsSubmitting(true);
        await new Promise(res => setTimeout(res, 500));
        try {
            // Update local state
            setSchoolClasses(prevClasses => prevClasses.map(c => ({
                ...c,
                offeredSubjects: (c.offeredSubjects || []).filter(id => id !== subjectId)
            })));
            setSubjects(prev => prev.filter(s => s.id !== subjectId));
            
            toast({ title: 'Subject Removed' });
        } catch(error) {
             console.error("Error removing subject:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not remove subject.'});
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssignSubjectToClass = async (classId: string, subjectId: string) => {
        if (!subjectId) return;
        setIsSubmitting(true);
        await new Promise(res => setTimeout(res, 500));
        try {
            setSchoolClasses(prevClasses => prevClasses.map(c => {
                if (c.id === classId) {
                    const updatedSubjects = [...(c.offeredSubjects || []), subjectId];
                    return { ...c, offeredSubjects: [...new Set(updatedSubjects)] };
                }
                return c;
            }));
            
            const subjectName = subjects.find(s => s.id === subjectId)?.name;
            const className = schoolClasses.find(c => c.id === classId)?.name;
            toast({ title: 'Subject Assigned', description: `Assigned "${subjectName}" to ${className}.`});
        } catch(error) {
            console.error("Error assigning subject:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not assign subject.'});
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveSubjectFromClass = async (classId: string, subjectId: string) => {
         setIsSubmitting(true);
         await new Promise(res => setTimeout(res, 500));
         try {
            setSchoolClasses(prevClasses => prevClasses.map(c => {
                if (c.id === classId) {
                    return { ...c, offeredSubjects: (c.offeredSubjects || []).filter(id => id !== subjectId) };
                }
                return c;
            }));
             toast({ title: 'Subject Unassigned' });
         } catch(error) {
            console.error("Error unassigning subject:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not unassign subject.'});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const displayedClasses = useMemo(() => {
        if (selectedCategory === 'all') return mySchoolClasses;
        return mySchoolClasses.filter(c => c.category === selectedCategory);
    }, [selectedCategory, mySchoolClasses]);
    
    const displayedSubjects = useMemo(() => {
        return schoolSubjects.reduce((acc, subject) => {
            (acc[subject.category] = acc[subject.category] || []).push(subject);
            return acc;
        }, {} as Record<SchoolCategory, Subject[]>);
    }, [schoolSubjects]);


    const renderClassSubjectManager = (classes: SchoolClass[]) => {
        if (classes.length === 0) {
            return <p className="text-sm text-muted-foreground text-center py-4">No classes found in this category.</p>
        }
        return classes.map(sc => {
            const assignableSubjects = schoolSubjects.filter(s => s.category === sc.category && !(sc.offeredSubjects || []).includes(s.id));
            return (
                <div key={sc.id} className="border p-4 rounded-lg">
                    <h4 className="font-bold">{sc.name}</h4>
                    <div className="my-4 space-y-2">
                        <p className="text-sm font-medium">Offered Subjects:</p>
                        {(sc.offeredSubjects && sc.offeredSubjects.length > 0) ? (
                            <div className="flex flex-wrap gap-2">
                                {sc.offeredSubjects.map(subjectId => {
                                    const subject = subjects.find(s => s.id === subjectId);
                                    return (
                                        <Badge key={subjectId} variant="secondary" className="flex items-center gap-1.5 pr-1">
                                            {subject?.name || 'Unknown Subject'}
                                            <button 
                                                onClick={() => handleRemoveSubjectFromClass(sc.id, subjectId)} 
                                                className="rounded-full hover:bg-destructive/20 text-destructive p-0.5"
                                                aria-label={`Remove ${subject?.name || 'subject'}`}
                                                disabled={isSubmitting}
                                            >
                                                <X size={12} />
                                            </button>
                                        </Badge>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">No subjects assigned yet.</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Select onValueChange={(val) => handleAssignSubjectToClass(sc.id, val)} disabled={assignableSubjects.length === 0 || isSubmitting}>
                            <SelectTrigger>
                                <SelectValue placeholder={assignableSubjects.length > 0 ? "Add a subject..." : "No subjects to add"} />
                            </SelectTrigger>
                            <SelectContent>
                                {assignableSubjects.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
                    <BookMarked /> Subject Management
                </h1>
                <p className="text-muted-foreground">
                    Manage subjects for your school and assign them to classes.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add New Subject</CardTitle>
                            <CardDescription>Create a new subject for your school.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input
                                placeholder="e.g., Further Mathematics"
                                value={newSubject.name}
                                onChange={(e) => setNewSubject(s => ({...s, name: e.target.value}))}
                                disabled={isSubmitting}
                            />
                            <Select value={newSubject.category} onValueChange={(value) => setNewSubject(s => ({...s, category: value as SchoolCategory}))} disabled={isSubmitting}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="nursery">Nursery School</SelectItem>
                                    <SelectItem value="primary">Primary School</SelectItem>
                                    <SelectItem value="upperBasic">Upper Basic</SelectItem>
                                    <SelectItem value="highSchool">High School</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={handleAddSubject} className="w-full" disabled={!newSubject.name.trim() || !newSubject.category || isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />} Add Subject
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>School Subject List</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {Object.keys(displayedSubjects).length > 0 ? (
                                (Object.keys(displayedSubjects) as SchoolCategory[]).map(category => (
                                    <div key={category}>
                                        <h4 className="font-semibold capitalize mb-2">{category.replace('highSchool', 'High School').replace('upperBasic', 'Upper Basic')}</h4>
                                        <ul className="space-y-2 border-l pl-4">
                                            {displayedSubjects[category].map(subject => (
                                                <li key={subject.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                                    <span className="font-medium">{subject.name}</span>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveSubject(subject.id)} disabled={isSubmitting}>
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No subjects added yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Assign Subjects to Classes</CardTitle>
                            <CardDescription>Manage which subjects are offered for each class.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="category-select">Select School Category</Label>
                                <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as SchoolCategory | 'all')}>
                                    <SelectTrigger id="category-select">
                                        <SelectValue placeholder="Select a category..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        <SelectItem value="nursery">Nursery School</SelectItem>
                                        <SelectItem value="primary">Primary School</SelectItem>
                                        <SelectItem value="upperBasic">Upper Basic</SelectItem>
                                        <SelectItem value="highSchool">High School</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-4">
                                {renderClassSubjectManager(displayedClasses)}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
