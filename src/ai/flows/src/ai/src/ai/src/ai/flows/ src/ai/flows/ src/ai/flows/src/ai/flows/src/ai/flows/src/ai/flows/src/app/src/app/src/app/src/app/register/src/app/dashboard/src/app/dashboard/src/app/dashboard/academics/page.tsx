// src/app/dashboard/academics/page.tsx
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useUser, type AttendanceState } from '@/context/user-context';
import { Student, Grade, SchoolClass, Psychomotor, CbtTest, StudentTestAttempt } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { BookOpen, Loader2, Save, UserCheck, UserX, Star, StarHalf, Edit, Printer, MessageSquare, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { manageGrades } from '@/ai/flows/grade-management-flow';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { generateStudentRemark } from '@/ai/flows/generate-student-remark-flow';

const calculateAttendanceSummary = (regNo: string, attendance: AttendanceState) => {
  let presentCount = 0;
  let absentCount = 0;

  Object.values(attendance).forEach(dailyRecord => {
    const studentRecord = dailyRecord[regNo];
    if (studentRecord) {
      if (studentRecord.morning === 'present' || studentRecord.afternoon === 'present') {
        presentCount++;
      } else {
        absentCount++;
      }
    }
  });

  return { presentCount, absentCount };
}

const PsychomotorRating = ({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 !== 0;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="flex gap-1">
      {[...Array(fullStars)].map((_, i) => <Star key={`full-${i}`} className="h-4 w-4 text-yellow-400 fill-yellow-400" />)}
      {halfStar && <StarHalf key="half" className="h-4 w-4 text-yellow-400 fill-yellow-400" />}
      {[...Array(emptyStars)].map((_, i) => <Star key={`empty-${i}`} className="h-4 w-4 text-muted-foreground/50" />)}
    </div>
  );
};

const StudentResultSheet = ({ student, schoolClass, onUpdateStudent }: { student: Student, schoolClass: any, onUpdateStudent: (updatedStudent: Student) => void }) => {
  const { user, staff, attendance, studentTestAttempts, cbtTests } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingRemark, setIsGeneratingRemark] = useState(false);
  
  const mergedGrades = useMemo(() => {
    const baseGrades = JSON.parse(JSON.stringify(student.grades || []));
    const studentAttempts = studentTestAttempts.filter(
        (attempt) => attempt.studentRegNo === student.regNo
    );
    
    for (const attempt of studentAttempts) {
        const test = cbtTests.find((t) => t.id === attempt.testId);
        if (test && test.resultsPublished) {
            let grade = baseGrades.find((g: Grade) => g.subject === test.subject);
            if (!grade) {
                grade = { subject: test.subject, firstCA: null, secondCA: null, project: null, exam: null };
                baseGrades.push(grade);
            }
            
            const totalObjMarks = test.objectiveQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
            const totalEssayMarks = test.essayQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
            const totalTestMarks = totalObjMarks + totalEssayMarks;

            let finalScoreOutOfCategory = attempt.totalScore;
            if (totalTestMarks > 0) {
              const percentageScore = (attempt.objectiveScore + Object.values(attempt.essayScores).reduce((acc, s) => acc + s.score, 0)) / totalTestMarks;
               if (test.category === '1st CA' || test.category === '2nd CA') {
                 finalScoreOutOfCategory = percentageScore * 20;
              } else if (test.category === 'Exam') {
                 finalScoreOutOfCategory = percentageScore * 50;
              }
            }
            
            if (test.category === '1st CA' && grade.firstCA === null) {
                grade.firstCA = finalScoreOutOfCategory;
            } else if (test.category === '2nd CA' && grade.secondCA === null) {
                grade.secondCA = finalScoreOutOfCategory;
            } else if (test.category === 'Exam' && grade.exam === null) {
                grade.exam = finalScoreOutOfCategory;
            }
        }
    }
    return baseGrades;

  }, [student, studentTestAttempts, cbtTests]);

  const [editableGrades, setEditableGrades] = useState<Grade[]>(mergedGrades);
  const [editablePsychomotor, setEditablePsychomotor] = useState<Psychomotor[]>(JSON.parse(JSON.stringify(student.psychomotor || [])));
  const [teacherRemark, setTeacherRemark] = useState(student.teacherRemark || '');

  useEffect(() => {
    setEditableGrades(mergedGrades);
    setEditablePsychomotor(JSON.parse(JSON.stringify(student.psychomotor || [])));
    setTeacherRemark(student.teacherRemark || '');
  }, [student, mergedGrades]);

  const canEdit = useMemo(() => {
    if (!user) return false;
    return user.role === 'Admin' || (user.role === 'Staff' && user.name === schoolClass.teacher);
  }, [user, schoolClass]);
  
  const isParent = user?.role === 'Parent' && student.parentContact === user.phoneNo;

  const handleGradeChange = (subject: string, field: keyof Omit<Grade, 'subject'>, value: string) => {
    const numericValue = value === '' ? null : Number(value);
    setEditableGrades(prevGrades =>
      prevGrades.map(g =>
        g.subject === subject ? { ...g, [field]: numericValue } : g
      )
    );
  };
  
  const handlePsychomotorChange = (skill: string, value: string) => {
    const numericValue = Math.max(1, Math.min(5, Number(value))) as Psychomotor['rating'];
    setEditablePsychomotor(prev => 
      prev.map(p => p.skill === skill ? {...p, rating: numericValue} : p)
    )
  }
  
  const handleMessageTeacher = () => {
    const teacher = staff.find(s => s.name === schoolClass.teacher);
    if (teacher && teacher.email) {
      router.push(`/dashboard/messaging/compose?recipient=${teacher.email}&topic=Regarding ${student.name}`);
    } else {
      toast({ variant: 'destructive', title: 'Teacher not found', description: 'Could not find the contact details for this teacher.' });
    }
  };

  const handleSaveChanges = async () => {
    setIsProcessing(true);
    try {
      const result = await manageGrades({
        studentName: student.name,
        grades: editableGrades.map(g => ({...g}))
      });

      const updatedStudent: Student = {
        ...student,
        grades: result.updatedGrades,
        psychomotor: editablePsychomotor,
        teacherRemark: teacherRemark,
      };

      onUpdateStudent(updatedStudent);

      toast({
        title: "Grades Updated",
        description: `Successfully updated grades for ${student.name}. The AI has provided remarks.`,
      });
    } catch (error) {
      console.error("AI grade management failed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update grades. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTotalScore = (grades: Grade[] | undefined) => {
      if (!grades || grades.length === 0) return 0;
      const total = grades.reduce((acc, grade) => {
        const gradeTotal = (grade.firstCA || 0) + (grade.secondCA || 0) + (grade.project || 0) + (grade.exam || 0);
        return acc + gradeTotal;
      }, 0);
      return total / grades.length;
  };
  
  const handleGenerateRemark = async () => {
    if (!user) return;
    setIsGeneratingRemark(true);
    try {
        const result = await generateStudentRemark({
            studentName: student.name,
            grades: editableGrades.map(g => ({
                subject: g.subject,
                totalScore: (g.firstCA || 0) + (g.secondCA || 0) + (g.project || 0) + (g.exam || 0),
            })),
            overallAverage: totalMarks,
            attendance: { present: presentCount, absent: absentCount },
            psychomotorSkills: editablePsychomotor,
            perspective: user.isChiefAdmin ? 'Principal' : 'Form Teacher'
        });
        setTeacherRemark(result.remark);
        toast({ title: 'Remark Generated', description: 'AI-powered remark has been generated. You can edit it before saving.' });
    } catch (error) {
        console.error("AI remark generation failed:", error);
        toast({ variant: "destructive", title: "Generation Failed", description: "Could not generate remark."});
    } finally {
        setIsGeneratingRemark(false);
    }
  }

  const totalMarks = calculateTotalScore(editableGrades);
  const { presentCount, absentCount } = calculateAttendanceSummary(student.regNo, attendance);

  const getRemark = (avg: number) => {
    if (avg >= 75) return "Excellent";
    if (avg >= 60) return "Good";
    if (avg >= 50) return "Satisfactory";
    return "Needs Improvement";
  };

  return (
    <SheetContent className="w-full sm:max-w-4xl flex flex-col">
      <SheetHeader>
        <SheetTitle className="font-headline text-2xl">Student Result Sheet</SheetTitle>
      </SheetHeader>
      <ScrollArea className="flex-grow">
      <div className="mt-6 space-y-6 pr-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person" />
                <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="font-headline">{student.name}</CardTitle>
                <CardDescription>Reg No: {student.regNo}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Academic Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">1st C.A (20)</TableHead>
                      <TableHead className="text-center">2nd C.A (20)</TableHead>
                      <TableHead className="text-center">Project (10)</TableHead>
                      <TableHead className="text-center">Exam (50)</TableHead>
                      <TableHead className="text-right">Total (100)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editableGrades.map((grade) => {
                      const total = (grade.firstCA || 0) + (grade.secondCA || 0) + (grade.project || 0) + (grade.exam || 0);
                      
                      return (
                        <TableRow key={grade.subject}>
                          <TableCell className="font-medium">{grade.subject}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={grade.firstCA?.toFixed(1) ?? ''}
                              onChange={(e) => handleGradeChange(grade.subject, 'firstCA', e.target.value)}
                              className="w-20 text-center"
                              disabled={!canEdit || isProcessing}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={grade.secondCA?.toFixed(1) ?? ''}
                              onChange={(e) => handleGradeChange(grade.subject, 'secondCA', e.target.value)}
                              className="w-20 text-center"
                              disabled={!canEdit || isProcessing}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={grade.project ?? ''}
                              onChange={(e) => handleGradeChange(grade.subject, 'project', e.target.value)}
                              className="w-20 text-center"
                              disabled={!canEdit || isProcessing}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={grade.exam?.toFixed(1) ?? ''}
                              onChange={(e) => handleGradeChange(grade.subject, 'exam', e.target.value)}
                              className="w-20 text-center"
                              disabled={!canEdit || isProcessing}
                            />
                          </TableCell>
                          <TableCell className="text-right font-semibold">{total.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Overall Average</p>
                  <p className="text-2xl font-bold">{totalMarks.toFixed(2)}%</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Position</p>
                  <p className="text-2xl font-bold">N/A</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Remark</p>
                  <p className="text-2xl font-bold">{getRemark(totalMarks)}</p>
                </div>
              </CardContent>
            </Card>
            
            {(isParent || canEdit) && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare /> Teacher's Remark
                    </div>
                    {canEdit && (
                         <Button variant="outline" size="sm" onClick={handleGenerateRemark} disabled={isGeneratingRemark || isProcessing}>
                            {isGeneratingRemark ? <Loader2 className="animate-spin" /> : <Sparkles className="mr-2"/>}
                            Generate with AI
                        </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {canEdit ? (
                    <div className="space-y-2">
                      <Label htmlFor="teacher-remark">Write a private remark for the parent to see. You can generate one with AI.</Label>
                      <Textarea 
                        id="teacher-remark"
                        placeholder="e.g., John has shown great improvement in Mathematics..."
                        value={teacherRemark}
                        onChange={(e) => setTeacherRemark(e.target.value)}
                        disabled={isProcessing || isGeneratingRemark}
                        className="min-h-[120px]"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">"{student.teacherRemark || 'No remark has been left by the teacher.'}"</p>
                  )}
                </CardContent>
              </Card>
            )}

          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-100/50 dark:bg-green-900/20 rounded-md">
                    <div className='flex items-center gap-2'>
                        <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="font-medium text-green-800 dark:text-green-300">Days Present</span>
                    </div>
                    <span className="font-bold text-lg text-green-800 dark:text-green-300">{presentCount}</span>
                </div>
                 <div className="flex items-center justify-between p-3 bg-red-100/50 dark:bg-red-900/20 rounded-md">
                    <div className='flex items-center gap-2'>
                        <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <span className="font-medium text-red-800 dark:text-red-300">Days Absent</span>
                    </div>
                    <span className="font-bold text-lg text-red-800 dark:text-red-300">{absentCount}</span>
                </div>
              </CardContent>
            </Card>
             <Card>
              <CardHeader>
                <CardTitle className="font-headline">Psychomotor & Affective Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skill</TableHead>
                      <TableHead className="text-right">Rating (1-5)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editablePsychomotor.map((p) => (
                      <TableRow key={p.skill}>
                        <TableCell className="font-medium">{p.skill}</TableCell>
                        <TableCell className="text-right">
                          {canEdit ? (
                             <Select
                                value={String(p.rating)}
                                onValueChange={(value) => handlePsychomotorChange(p.skill, value)}
                                disabled={isProcessing}
                              >
                                <SelectTrigger className="w-24 ml-auto">
                                  <SelectValue placeholder="Rate" />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5].map(val => (
                                    <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                          ) : (
                            <PsychomotorRating rating={p.rating} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
             {isParent && schoolClass.teacher && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Contact Teacher</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" variant="outline" onClick={handleMessageTeacher}>
                           <MessageSquare className="mr-2"/> Message {schoolClass.teacher}
                        </Button>
                    </CardContent>
                </Card>
            )}
          </div>
        </div>
      </div>
      </ScrollArea>

        <div className="space-y-2 mt-4 pt-4 border-t">
            {canEdit && (
            <Button className="w-full" onClick={handleSaveChanges} disabled={isProcessing || isGeneratingRemark}>
                {isProcessing ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
            </Button>
            )}
            <Button className="w-full" variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Save Result as PDF</Button>
        </div>
    </SheetContent>
  );
};


export default function AcademicsPage() {
    const { user, schoolClasses, setSchoolClasses, staff, students, setStudents } = useUser();
    const { toast } = useToast();

    const mySchoolClasses = useMemo(() => {
        if (!user || !user.schoolId) return [];
        if (user.role === 'Parent' || user.role === 'Student') {
            return schoolClasses.filter(c => c.id === user.classId);
        }
        return schoolClasses.filter(c => c.schoolId === user.schoolId);
    }, [user, schoolClasses]);

    const handleUpdateStudent = useCallback((classId: string, updatedStudent: Student) => {
        setStudents(prevStudents => prevStudents.map(s => s.regNo === updatedStudent.regNo ? updatedStudent : s));

        setSchoolClasses(prevClasses => prevClasses.map(c => {
            if (c.id === classId) {
                return {
                    ...c,
                    students: c.students.map(s => s.regNo === updatedStudent.regNo ? updatedStudent : s)
                };
            }
            return c;
        }));
    }, [setStudents, setSchoolClasses]);

    const handleTeacherChange = useCallback((classId: string, teacherName: string) => {
        setSchoolClasses(prevClasses => prevClasses.map(c => 
            c.id === classId ? { ...c, teacher: teacherName } : c
        ));
        toast({
            title: "Teacher Assigned",
            description: `${teacherName} is now the form teacher for class ${classId.toUpperCase()}.`
        });
    }, [setSchoolClasses, toast]);

    const canViewReport = (student: Student) => {
        if (!user) return false;
        if (user.role === 'Admin' || user.role === 'Staff') return true;
        if (user.role === 'Student' && user.regNo && student.regNo === user.regNo) return true;
        if (user.role === 'Parent' && student.parentContact === user.phoneNo) return true;
        return false;
    };

    if (!user) {
        return null;
    }
    
    const myTeachers = staff.filter(t => t.schoolId === user.schoolId);
    const defaultAccordionValue = mySchoolClasses.length > 0 ? mySchoolClasses[0].id : undefined;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Academics</h1>
                <p className="text-muted-foreground">
                    {user.role === 'Student' || user.role === 'Parent' ? 'View your academic performance.' : 'Manage classes, subjects, and student performance.'}
                </p>
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full" defaultValue={defaultAccordionValue}>
                {mySchoolClasses.map(schoolClass => (
                    <AccordionItem value={schoolClass.id} key={schoolClass.id}>
                        <AccordionTrigger className="font-headline text-xl">
                            Class: {schoolClass.name}
                        </AccordionTrigger>
                        <AccordionContent>
                             <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle>Class List</CardTitle>
                                            <CardDescription>
                                                Form Teacher: {schoolClass.teacher || 'Unassigned'}
                                            </CardDescription>
                                        </div>
                                        {user.role === 'Admin' && (
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm">
                                                        <Edit className="mr-2 h-3 w-3" />
                                                        Change Teacher
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {myTeachers.map(teacher => (
                                                        <DropdownMenuItem 
                                                            key={teacher.email}
                                                            onSelect={() => handleTeacherChange(schoolClass.id, teacher.name)}
                                                            disabled={teacher.name === schoolClass.teacher}
                                                        >
                                                            {teacher.name}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Student</TableHead>
                                                <TableHead>Reg. No</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {schoolClass.students && schoolClass.students.length > 0 ? (
                                              schoolClass.students
                                                .filter(s => {
                                                    if (!user) return false;
                                                    if (user.role === 'Parent') return s.regNo === user.regNo;
                                                    if (user.role === 'Student') return s.regNo === user.regNo;
                                                    return true;
                                                })
                                                .map(student => (
                                                  <TableRow key={student.regNo}>
                                                      <TableCell>
                                                          <div className="flex items-center gap-3">
                                                              <Avatar className="h-9 w-9">
                                                                  <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person" />
                                                                  <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                              </Avatar>
                                                              <span className="font-medium">{student.name}</span>
                                                          </div>
                                                      </TableCell>
                                                      <TableCell>{student.regNo}</TableCell>
                                                      <TableCell className="text-right">
                                                          {canViewReport(student) ? (
                                                              <Sheet>
                                                                  <SheetTrigger asChild>
                                                                      <Button variant="outline" size="sm">
                                                                          <BookOpen className="mr-2 h-4 w-4" />
                                                                          View Report
                                                                      </Button>
                                                                  </SheetTrigger>
                                                                  <StudentResultSheet 
                                                                      student={student} 
                                                                      schoolClass={schoolClass} 
                                                                      onUpdateStudent={(s) => handleUpdateStudent(schoolClass.id, s)} 
                                                                  />
                                                              </Sheet>
                                                          ) : null}
                                                      </TableCell>
                                                  </TableRow>
                                              ))
                                            ) : (
                                              <TableRow>
                                                <TableCell colSpan={3} className="text-center text-muted-foreground">
                                                  No students in this class yet.
                                                </TableCell>
                                              </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}
