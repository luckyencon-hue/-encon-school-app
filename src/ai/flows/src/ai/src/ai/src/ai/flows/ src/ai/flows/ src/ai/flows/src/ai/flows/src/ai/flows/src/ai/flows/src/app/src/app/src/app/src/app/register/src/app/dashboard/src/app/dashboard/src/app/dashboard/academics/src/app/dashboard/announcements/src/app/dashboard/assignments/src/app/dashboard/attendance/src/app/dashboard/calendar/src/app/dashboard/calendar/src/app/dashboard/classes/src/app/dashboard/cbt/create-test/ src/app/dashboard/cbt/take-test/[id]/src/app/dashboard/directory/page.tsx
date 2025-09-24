// src/app/dashboard/directory/page.tsx
"use client";

import { useState, useMemo } from 'react';
import { useUser } from '@/context/user-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, UserCog, UserPlus, Loader2, LogIn, Users, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Staff, StaffPosition, StaffStatus, User as AdminUser, User } from '@/lib/data';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const staffSchema = z.object({
  name: z.string().min(2, "Full name is required."),
  email: z.string().email("A valid email is required."),
  staffId: z.string().min(1, "Staff ID is required."),
  phoneNo: z.string().min(10, "A valid phone number is required."),
  position: z.enum(['Principal', 'Admin', 'HOD', 'Classroom Teacher', 'Form Master', 'Minder', 'Non-academic'], { required_error: 'Please select a position.' }),
  status: z.enum(['Full-time', 'Part-time'], { required_error: 'Please select a status.' }),
  subjectsTaught: z.array(z.string()).optional(),
});

type StaffFormValues = z.infer<typeof staffSchema>;


export default function DirectoryPage() {
  const { user, setUser, staff, setStaff, subjects, admins, setAdmins, students, schoolClasses } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: '',
      email: '',
      staffId: '',
      phoneNo: '',
      subjectsTaught: [],
    },
  });

  if (!user) return null;

  const isAdmin = user.role === 'Admin';
  
  const schoolStaff = staff.filter(t => t.schoolId === user.schoolId);
  const schoolStudents = students.filter(s => s.schoolId === user.schoolId);
  const schoolSubjects = subjects.filter(s => s.schoolId === user.schoolId).map(s => s.name);
  
  const schoolParents = useMemo(() => {
    const parentMap = new Map<string, User>();
    schoolStudents.forEach(s => {
        if(s.parentContact && !parentMap.has(s.parentContact)) {
            parentMap.set(s.parentContact, {
                name: s.parentName,
                role: 'Parent',
                avatar: s.avatar,
                schoolId: s.schoolId,
                schoolName: s.schoolName,
                status: 'Active',
                phoneNo: s.parentContact,
                regNo: s.regNo,
                classId: s.classId,
                email: s.parentContact, // Use phone number as a unique ID for login
            });
        }
    });
    return Array.from(parentMap.values());
  }, [schoolStudents]);


  const handleAddStaff = async (data: StaffFormValues) => {
    if (!user || !user.schoolId) {
        toast({variant: 'destructive', title: 'Error', description: 'Could not determine your school ID.'});
        return;
    }
    if (staff.some(t => t.email.toLowerCase() === data.email.toLowerCase() && t.schoolId === user.schoolId)) {
      form.setError("email", { message: "This email already exists."});
      return;
    }
     if (staff.some(t => t.staffId === data.staffId && t.schoolId === user.schoolId)) {
      form.setError("staffId", { message: "This Staff ID already exists."});
      return;
    }
    
    setIsSubmitting(true);
    try {
        const newStaff: Staff = {
          ...data,
          password: data.phoneNo, // Phone number is the password
          avatar: `https://picsum.photos/seed/${data.email}/100/100`,
          schoolId: user.schoolId,
          role: 'Staff',
        };

        // Use email as doc ID for staff for easier lookup/uniqueness
        await setDoc(doc(db, "staff", newStaff.email), newStaff);
    
        setStaff(prev => [...prev, newStaff]);
        toast({ title: 'Staff Added', description: `${newStaff.name} has been added to the directory.` });
        form.reset();

    } catch (error) {
        console.error("Error adding staff:", error);
        toast({variant: 'destructive', title: 'Error', description: 'Failed to add staff to the database.'});
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleRemoveStaff = async (email: string) => {
    setIsSubmitting(true);
    try {
        await deleteDoc(doc(db, "staff", email));
        setStaff(prev => prev.filter(t => t.email !== email));
        // Also remove from admins if they were one
        const adminToDelete = admins.find(a => a.email === email);
        if (adminToDelete && !adminToDelete.isChiefAdmin) { // Chief admins cannot be demoted/deleted this way
            await deleteDoc(doc(db, "admins", email));
            setAdmins(prev => prev.filter(a => a.email !== email));
        }
        toast({ title: 'Staff Removed' });
    } catch(error) {
        console.error("Error removing staff:", error);
        toast({variant: 'destructive', title: 'Error', description: 'Failed to remove staff.'});
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handlePromoteToAdmin = async (staffMember: Staff) => {
    if(admins.some(a => a.email === staffMember.email)) {
      toast({ title: 'Already an Admin', description: `${staffMember.name} is already an administrator.`});
      return;
    }

    const newAdmin: AdminUser = {
      name: staffMember.name,
      firstName: staffMember.name.split(' ')[0],
      surname: staffMember.name.split(' ').slice(1).join(' '),
      role: "Admin",
      avatar: staffMember.avatar,
      isChiefAdmin: false,
      email: staffMember.email,
      password: staffMember.phoneNo, // Phone number is the password
      phoneNo: staffMember.phoneNo,
      schoolId: user.schoolId,
      schoolName: user.schoolName,
      status: 'Active',
    };
    
    setIsSubmitting(true);
    try {
        await setDoc(doc(db, "admins", newAdmin.email!), newAdmin);
        setAdmins(prev => [...prev, newAdmin]);
        toast({
          title: "Admin Added",
          description: `${newAdmin.name} has been promoted to an administrator.`,
        });
    } catch (error) {
         console.error("Error promoting staff:", error);
        toast({variant: 'destructive', title: 'Error', description: 'Failed to promote staff.'});
    } finally {
        setIsSubmitting(false);
    }
  }
  
    const handleLoginAs = (userToLoginAs: User) => {
    let fullUserObject: User | undefined;
  
    if (userToLoginAs.role === 'Staff') {
      fullUserObject = staff.find(s => s.email === userToLoginAs.email);
    } else if (userToLoginAs.role === 'Student') {
      fullUserObject = students.find(s => s.regNo === userToLoginAs.regNo);
    } else if (userToLoginAs.role === 'Parent') {
      fullUserObject = userToLoginAs;
    }
  
    if (fullUserObject) {
      setUser(fullUserObject);
      router.push('/dashboard');
      toast({
        title: `Logged in as ${fullUserObject.name}`,
        description: `You are now viewing the dashboard as a ${fullUserObject.role}.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Could not find the full user object to log in.',
      });
    }
  };
  
  const handleSendMessage = (recipient: User) => {
    const recipientId = recipient.role === 'Parent' ? recipient.phoneNo : recipient.email;
    router.push(`/dashboard/messaging/compose?recipient=${recipientId}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Directory</h1>
        <p className="text-muted-foreground">
          {isAdmin ? 'Manage staff, student, and parent directories for your school.' : 'Find contact information for staff members.'}
        </p>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="staff">
            <TabsList>
                <TabsTrigger value="staff">Staff</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="parents">Parents</TabsTrigger>
            </TabsList>
            <TabsContent value="staff" className="mt-4">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><UserPlus />Add New Staff</CardTitle>
                            <CardDescription>Enroll a new staff member into the school system.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleAddStaff)} className="space-y-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Full Name" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input placeholder="Email Address" type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="staffId" render={({ field }) => (
                                <FormItem><FormLabel>Staff ID</FormLabel><FormControl><Input placeholder="Staff ID" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="phoneNo" render={({ field }) => (
                                <FormItem><FormLabel>Phone Number (Default Password)</FormLabel><FormControl><Input placeholder="Phone Number" type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="position" render={({ field }) => (
                                <FormItem><FormLabel>Position</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Position" /></SelectTrigger></FormControl>
                                    <SelectContent>{['Principal', 'Admin', 'HOD', 'Classroom Teacher', 'Form Master', 'Minder', 'Non-academic'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                                )}/>
                                <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem><FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                    <SelectContent>{['Full-time', 'Part-time'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                                )}/>
                                <FormField control={form.control} name="subjectsTaught" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subjects Taught (Max 3)</FormLabel>
                                        <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start">
                                            {field.value && field.value.length > 0 ? `Selected (${field.value.length})` : 'Select Subjects Taught'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-56 p-2">
                                            <div className="space-y-1">
                                            {schoolSubjects.map((subject) => (
                                                <div key={subject} className="flex items-center gap-2 p-1 rounded-md hover:bg-accent">
                                                <Checkbox
                                                    id={`subject-${subject}`}
                                                    checked={field.value?.includes(subject)}
                                                    onCheckedChange={(checked) => {
                                                        const currentValue = field.value || [];
                                                        if (checked) {
                                                            if(currentValue.length < 3) field.onChange([...currentValue, subject]);
                                                            else toast({variant: 'destructive', title: 'You can only select up to 3 subjects.'})
                                                        } else {
                                                            field.onChange(currentValue.filter(s => s !== subject));
                                                        }
                                                    }}
                                                />
                                                <label htmlFor={`subject-${subject}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{subject}</label>
                                                </div>
                                            ))}
                                            </div>
                                        </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <PlusCircle className="mr-2" />} Add Staff
                                </Button>
                            </form>
                            </Form>
                        </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Staff List</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Staff ID</TableHead>
                                            <TableHead>Position</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {schoolStaff.map(staffMember => (
                                            <TableRow key={staffMember.email}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9">
                                                            <AvatarImage src={staffMember.avatar} alt={staffMember.name} data-ai-hint="person" />
                                                            <AvatarFallback>{staffMember.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium">{staffMember.name}</p>
                                                            <p className="text-xs text-muted-foreground">{staffMember.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{staffMember.staffId}</TableCell>
                                                <TableCell>{staffMember.position}</TableCell>
                                                <TableCell className="text-right space-x-1">
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleSendMessage(staffMember)} disabled={isSubmitting}>
                                                        <MessageSquare className="h-4 w-4"/>
                                                        <span className="sr-only">Send Message</span>
                                                    </Button>
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleLoginAs(staffMember)} disabled={isSubmitting}>
                                                        <LogIn className="h-4 w-4"/>
                                                        <span className="sr-only">Login as</span>
                                                    </Button>
                                                    {user.isChiefAdmin && (
                                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePromoteToAdmin(staffMember)} disabled={isSubmitting}>
                                                            <UserCog className="h-4 w-4"/>
                                                            <span className="sr-only">Make Admin</span>
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveStaff(staffMember.email)} disabled={isSubmitting}>
                                                        <Trash2 className="h-4 w-4"/>
                                                        <span className="sr-only">Remove Staff</span>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="students" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Student Directory</CardTitle>
                        <CardDescription>List of all students enrolled in the school.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead>Reg. No.</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {schoolStudents.length > 0 ? (
                                    schoolStudents.map(student => (
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
                                        <TableCell>{schoolClasses.find(c => c.id === student.classId)?.name || 'N/A'}</TableCell>
                                        <TableCell className="text-right space-x-1">
                                             <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleLoginAs(student as User)} disabled={isSubmitting}>
                                                <LogIn className="h-4 w-4"/>
                                                <span className="sr-only">Login as Student</span>
                                            </Button>
                                        </TableCell>
                                     </TableRow>
                                    ))
                                 ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No students found.
                                        </TableCell>
                                    </TableRow>
                                 )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="parents" className="mt-4">
                <Card>
                     <CardHeader>
                        <CardTitle>Parent Directory</CardTitle>
                        <CardDescription>List of all parents with children enrolled in the school.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Parent Name</TableHead>
                                    <TableHead>Contact (Login ID)</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {schoolParents.map((parent, i) => (
                                     <TableRow key={`${parent.phoneNo}-${i}`}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={parent.avatar} alt={parent.name} data-ai-hint="person" />
                                                    <AvatarFallback>{parent.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{parent.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{parent.phoneNo}</TableCell>
                                        <TableCell className="text-right space-x-1">
                                             <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleSendMessage(parent)} disabled={isSubmitting}>
                                                <MessageSquare className="h-4 w-4"/>
                                                <span className="sr-only">Send Message</span>
                                            </Button>
                                             <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleLoginAs(parent)} disabled={isSubmitting}>
                                                <LogIn className="h-4 w-4"/>
                                                <span className="sr-only">Login as Parent</span>
                                            </Button>
                                        </TableCell>
                                     </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      ) : (
         <Card>
            <CardHeader>
                <CardTitle>Staff Directory</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {schoolStaff.map((staffMember, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                        <Avatar className="h-20 w-20 mb-4">
                        <AvatarImage src={staffMember.avatar} alt={staffMember.name} data-ai-hint="person" />
                        <AvatarFallback>{staffMember.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                        </Avatar>
                        <h3 className="font-headline font-semibold text-lg">{staffMember.name}</h3>
                        <p className="text-muted-foreground">{staffMember.position}</p>
                        <a
                        href={`mailto:${staffMember.email}`}
                        className="mt-2 text-sm text-primary/80 hover:text-primary flex items-center gap-1"
                        >
                        <PlusCircle className="h-3 w-3" />
                        {staffMember.email}
                        </a>
                    </CardContent>
                    </Card>
                    ))}
                </div>
            </CardContent>
         </Card>
      )}
    </div>
  );
}
