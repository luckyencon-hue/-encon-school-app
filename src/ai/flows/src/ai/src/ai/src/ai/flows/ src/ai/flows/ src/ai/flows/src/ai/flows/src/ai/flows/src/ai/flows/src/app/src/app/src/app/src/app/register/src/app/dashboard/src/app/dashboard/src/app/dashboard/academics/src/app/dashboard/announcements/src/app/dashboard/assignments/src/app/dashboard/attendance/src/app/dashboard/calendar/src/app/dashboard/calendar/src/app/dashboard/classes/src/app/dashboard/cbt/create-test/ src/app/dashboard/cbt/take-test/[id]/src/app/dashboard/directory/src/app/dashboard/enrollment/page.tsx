// src/app/dashboard/enrollment/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useUser, type User } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Student } from "@/lib/data";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, PlusCircle, Trash2, UserPlus, Camera, Video, Sparkles, Upload, Loader2, Edit, CheckCircle, XCircle, ShieldAlert, LogIn } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import { extractStudentData } from "@/ai/flows/extract-student-data-flow";
import { ScrollArea } from "@/components/ui/scroll-area";

const newStudentSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters."),
  middleName: z.string().optional(),
  surname: z.string().min(2, "Surname must be at least 2 characters."),
  regNo: z.string().min(3, "Registration number must be at least 3 characters."),
  email: z.string().email("Please enter a valid email address."),
  dob: z.date({ required_error: "Date of birth is required." }),
  parentName: z.string().min(2, "Parent/Guardian name is required."),
  parentContact: z.string().min(10, "Parent/Guardian contact must be at least 10 characters."),
  classId: z.string({ required_error: "Please select a class." }),
  nationality: z.string().min(2, "Nationality is required."),
  stateOfOrigin: z.string().min(2, "State of origin is required."),
  lga: z.string().min(2, "Local Government Area is required."),
  hobbies: z.string().min(2, "Hobbies are required."),
  bloodGroup: z.string().min(1, "Blood group is required."),
  genotype: z.string().min(2, "Genotype is required."),
  disabilities: z.string().optional(),
  healthConditions: z.string().optional(),
});

type NewStudentForm = z.infer<typeof newStudentSchema>;

const DRAFT_STORAGE_KEY = 'enrollment-form-draft';

const nigerianStates = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
    "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", 
    "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
    "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", 
    "Taraba", "Yobe", "Zamfara"
];

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const genotypes = ["AA", "AS", "AC", "SS"];
const commonHobbies = ["Reading", "Sports", "Music", "Art", "Dancing", "Gaming", "Cooking", "Writing"];

const AiScanForm = ({ onDataExtracted }: { onDataExtracted: (data: any) => void }) => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isScanning, setIsScanning] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 4 * 1024 * 1024) { // 4MB limit
            toast({ variant: 'destructive', title: 'File too large', description: 'Please upload an image smaller than 4MB.' });
            return;
        }

        setIsScanning(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const result = await extractStudentData({ formImage: reader.result as string });
                onDataExtracted(result);
                 toast({ title: 'Scan Successful', description: 'Form data has been extracted. Please review and save.' });
            } catch (error) {
                console.error("AI data extraction failed:", error);
                toast({ variant: 'destructive', title: 'Scan Failed', description: 'Could not extract data from the image. Please try again.' });
            } finally {
                setIsScanning(false);
            }
        };
        reader.onerror = () => {
            toast({ variant: 'destructive', title: 'File Error', description: 'Could not read the selected file.' });
             setIsScanning(false);
        };
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent"/> AI Form Scanner</CardTitle>
                <CardDescription>Upload a scanned enrollment form to automatically fill the fields below.</CardDescription>
            </CardHeader>
            <CardContent>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} className="w-full" disabled={isScanning}>
                    {isScanning ? <Loader2 className="animate-spin" /> : <Upload className="mr-2" />}
                    Upload & Scan Form
                </Button>
            </CardContent>
        </Card>
    );
};


export default function EnrollmentPage() {
  const { user, setUser, students, setStudents, schoolClasses, setSchoolClasses, pendingStudents, setPendingStudents, isEnrollmentOpen } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const defaultFormValues: NewStudentForm = {
      firstName: "",
      middleName: "",
      surname: "",
      regNo: "",
      email: "",
      parentName: "",
      parentContact: "",
      classId: "",
      nationality: "Nigerian",
      stateOfOrigin: "",
      lga: "",
      hobbies: "",
      bloodGroup: "",
      genotype: "",
      disabilities: "",
      healthConditions: "",
      dob: new Date(),
  };

  const form = useForm<NewStudentForm>({
    resolver: zodResolver(newStudentSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    const canEnroll = user?.role === "Admin" || user?.role === "Staff";
    if (!user || !canEnroll || (!isEnrollmentOpen && !user.isChiefAdmin)) {
      router.push("/dashboard");
    }
  }, [user, router, isEnrollmentOpen]);
  
  // Load draft from localStorage on mount
  useEffect(() => {
    if (editingStudent) return; // Don't load draft if editing
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        // Manually convert date string back to Date object
        if (draftData.dob) {
            draftData.dob = new Date(draftData.dob);
        }
        form.reset(draftData);
        if (draftData.capturedImage) {
          setCapturedImage(draftData.capturedImage);
        }
      } catch(e) {
        console.error("Failed to parse draft enrollment data", e);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }
  }, [form, editingStudent]);

  // Save form data to localStorage on change
  useEffect(() => {
    if (editingStudent) return; // Don't save draft if editing
    const subscription = form.watch((value) => {
      const dataToSave = { ...value, capturedImage };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(dataToSave));
    });
    return () => subscription.unsubscribe();
  }, [form, capturedImage, editingStudent]);


  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
      }
    };

    getCameraPermission();
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImage(dataUrl);
    }
  };
  
  const handleDataExtracted = (data: any) => {
    const formData: Partial<NewStudentForm> = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key) && data[key]) {
             if (key === 'dob' && typeof data.dob === 'string') {
                const date = new Date(data.dob);
                date.setDate(date.getDate() + 1);
                if (!isNaN(date.getTime())) {
                    formData.dob = date;
                }
            } else {
                 // @ts-ignore
                formData[key] = data[key];
            }
        }
    }
    form.reset(formData);
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setCapturedImage(student.avatar);
    form.reset({
      ...student,
      dob: student.dob ? new Date(student.dob) : new Date(),
    });
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveStudent: SubmitHandler<NewStudentForm> = async (data) => {
    setIsSubmitting(true);
    await new Promise(res => setTimeout(res, 500));
    
    try {
        if (editingStudent) { // Update existing student
            const updatedStudent: Student = {
              ...editingStudent,
              ...data,
              name: `${data.firstName} ${data.surname}`,
              avatar: capturedImage || editingStudent.avatar,
            };

            setStudents(prev => prev.map(s => s.regNo === editingStudent.regNo ? updatedStudent : s));
            setSchoolClasses(prevClasses => prevClasses.map(c => ({
                ...c,
                students: c.students.map(s => s.regNo === editingStudent.regNo ? updatedStudent : s)
            })));
            toast({ title: "Student Updated", description: `${updatedStudent.name}'s details have been updated.` });
            setEditingStudent(null);
        } else { // Add new student
            const newStudent: Student = {
              ...data,
              firstName: data.firstName,
              surname: data.surname,
              name: `${data.firstName} ${data.surname}`,
              avatar: capturedImage || `https://picsum.photos/seed/${Math.random()}/100/100`,
              schoolId: user?.schoolId!,
              schoolName: user?.schoolName!,
            };
            
            if (user?.role === 'Admin') {
                setStudents(prevStudents => [newStudent, ...prevStudents]);
                setSchoolClasses(prevClasses => prevClasses.map(c => {
                    if (c.id === data.classId) {
                        return { ...c, students: [...c.students, newStudent] };
                    }
                    return c;
                }));
                toast({ title: "Student Enrolled", description: `${newStudent.name} has been successfully enrolled.` });
            } else if (user?.role === 'Staff') {
                setPendingStudents(prev => [...prev, newStudent]);
                toast({ title: "Submission Sent", description: `${newStudent.name}'s enrollment is pending admin approval.` });
            }
        }
        setCapturedImage(null);
        form.reset(defaultFormValues);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
        console.error("Error saving student:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save student data.' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleRemoveStudent = (regNo: string) => {
    setStudents(prev => prev.filter(student => student.regNo !== regNo));
    setSchoolClasses(prev => prev.map(c => ({
        ...c,
        students: c.students.filter(s => s.regNo !== regNo)
    })));
  };

  const handleApprove = (studentToApprove: Student) => {
    setStudents(prev => [studentToApprove, ...prev]);
     setSchoolClasses(prevClasses => prevClasses.map(c => {
      if (c.id === studentToApprove.classId) {
        return { ...c, students: [...c.students, studentToApprove] };
      }
      return c;
    }));
    setPendingStudents(prev => prev.filter(s => s.regNo !== studentToApprove.regNo));
    toast({ title: 'Enrollment Approved', description: `${studentToApprove.name} is now an enrolled student.` });
  };

  const handleReject = (regNo: string) => {
    setPendingStudents(prev => prev.filter(s => s.regNo !== regNo));
    toast({ variant: 'destructive', title: 'Enrollment Rejected' });
  };
  
  const handleCancelEdit = () => {
    setEditingStudent(null);
    setCapturedImage(null);
    form.reset(defaultFormValues);
  }
  
  const handleLoginAs = (userToLogin: User) => {
    setUser(userToLogin);
    router.push('/dashboard');
    toast({
      title: `Logged in as ${userToLogin.name}`,
      description: `You are now viewing the dashboard as a ${userToLogin.role}.`,
    });
  };

  const canEnroll = user?.role === "Admin" || user?.role === "Staff";
  if (!user || !canEnroll) {
    return null;
  }
  
  if (!isEnrollmentOpen && !user.isChiefAdmin) {
     return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldAlert />Enrollment Closed</CardTitle>
            </CardHeader>
            <CardContent>
                <p>The student enrollment portal is currently closed by the school administration.</p>
            </CardContent>
        </Card>
     )
  }

  const enrolledStudents = students.filter(s => s.schoolId === user?.schoolId);
  const schoolPendingStudents = pendingStudents.filter(s => s.schoolId === user?.schoolId);
  const mySchoolClasses = schoolClasses.filter(c => c.schoolId === user?.schoolId);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Student Enrollment</h1>
        <p className="text-muted-foreground">
          {user.role === 'Admin' ? `Register or edit students for ${user.schoolName}.` : `Submit new student registrations for approval.`}
        </p>
      </div>
      
      {user?.role === 'Admin' && schoolPendingStudents.length > 0 && (
        <Card>
            <CardHeader>
                <CardTitle>Pending Enrollments</CardTitle>
                <CardDescription>Review and approve student registrations submitted by staff.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {schoolPendingStudents.map(student => (
                            <TableRow key={student.regNo}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person" />
                                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{student.name}</p>
                                        <p className="text-xs text-muted-foreground">{student.regNo}</p>
                                    </div>
                                    </div>
                                </TableCell>
                                <TableCell>{schoolClasses.find(c => c.id === student.classId)?.name}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleApprove(student)}><CheckCircle className="mr-2" />Approve</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleReject(student.regNo)}><XCircle className="mr-2"/>Reject</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      )}


      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
            {user.role === 'Admin' && <AiScanForm onDataExtracted={handleDataExtracted} />}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                <UserPlus className="h-5 w-5" />
                {editingStudent ? `Editing: ${editingStudent.name}` : (user.role === 'Admin' ? 'Register New Student' : 'Submit for Enrollment')}
              </CardTitle>
              <CardDescription>{editingStudent ? 'Update the details for this student.' : 'Enter the details for the new student.'}</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="pr-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveStudent)} className="space-y-4">
                   <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="middleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Middle Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Fitzgerald" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="surname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Surname</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="regNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration No.</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., S12345" {...field} disabled={!!editingStudent} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="e.g., john.doe@school.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Birth</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              captionLayout="dropdown-buttons"
                              fromYear={new Date().getFullYear() - 25}
                              toYear={new Date().getFullYear() - 3}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="parentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent/Guardian Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="parentContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent/Guardian Contact</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 555-123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="nationality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nationality</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Nigerian" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stateOfOrigin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State of Origin</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a state" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {nigerianStates.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="lga"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local Government Area</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Ikeja" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="hobbies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hobbies</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a hobby" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {commonHobbies.map(hobby => <SelectItem key={hobby} value={hobby}>{hobby}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bloodGroup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blood Group</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {bloodGroups.map(group => <SelectItem key={group} value={group}>{group}</SelectItem>)}
                            </SelectContent>
                           </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="genotype"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Genotype</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {genotypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                           </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="disabilities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disabilities (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., None, or specify" {...field} value={field.value ?? ''}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="healthConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Known Health Conditions (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., Asthma, or specify" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="classId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Class</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a class" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {mySchoolClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    <div className="space-y-2">
                        <FormLabel>Student Photograph</FormLabel>
                        <Card className="p-2">
                            {capturedImage ? (
                                <div className="relative">
                                    <Image src={capturedImage} alt="Captured student" width={400} height={300} className="rounded-md" />
                                    <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={() => setCapturedImage(null)}>Retake</Button>
                                </div>
                            ) : (
                                <>
                                    <div className="relative bg-muted rounded-md flex items-center justify-center">
                                       <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted playsInline />
                                       {hasCameraPermission === false && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-background/80">
                                                <Video className="h-8 w-8 text-muted-foreground mb-2" />
                                                <p className="text-sm text-muted-foreground">Camera not available or permission denied.</p>
                                            </div>
                                       )}
                                    </div>
                                    <Button type="button" onClick={handleCapture} disabled={!hasCameraPermission} className="w-full mt-2">
                                        <Camera className="mr-2 h-4 w-4" />
                                        Capture Photo
                                    </Button>
                                </>
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                        </Card>
                    </div>

                  {isSubmitting && <p className="text-sm text-destructive">Submitting...</p>}
                  <div className="flex flex-col gap-2 pt-4">
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : editingStudent ? <Edit className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        {editingStudent ? 'Update Student' : user?.role === 'Admin' ? 'Add Student' : 'Submit for Approval'}
                    </Button>
                    {editingStudent && (
                        <Button type="button" variant="outline" className="w-full" onClick={handleCancelEdit}>
                            Cancel Edit
                        </Button>
                    )}
                  </div>
                </form>
              </Form>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Enrolled Students</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Email</TableHead>
                    {user?.role === 'Admin' && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrolledStudents.map((student) => (
                    <TableRow key={student.regNo}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person" />
                            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.regNo}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{schoolClasses.find(c => c.id === student.classId)?.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      {user?.role === 'Admin' && (
                        <TableCell className="text-right space-x-2">
                           <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleLoginAs(student as User)}>
                            <LogIn className="h-4 w-4" />
                            <span className="sr-only">Login as</span>
                          </Button>
                           <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditClick(student)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveStudent(student.regNo)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
