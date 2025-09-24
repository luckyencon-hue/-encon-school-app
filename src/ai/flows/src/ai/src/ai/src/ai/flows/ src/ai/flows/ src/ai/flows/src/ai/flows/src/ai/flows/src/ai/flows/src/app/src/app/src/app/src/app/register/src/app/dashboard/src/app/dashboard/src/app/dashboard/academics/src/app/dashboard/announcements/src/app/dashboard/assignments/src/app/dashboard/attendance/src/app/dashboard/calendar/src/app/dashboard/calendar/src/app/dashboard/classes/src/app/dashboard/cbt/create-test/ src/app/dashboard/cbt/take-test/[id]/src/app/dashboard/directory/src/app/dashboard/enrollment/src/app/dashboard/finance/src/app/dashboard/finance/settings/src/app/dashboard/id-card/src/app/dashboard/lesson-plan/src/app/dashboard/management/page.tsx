// src/app/dashboard/management/page.tsx
"use client";

import { useUser, type User } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { KeyRound, PlusCircle, ShieldCheck, Trash2, UserPlus, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const newAdminSchema = z.object({
  firstName: z.string().min(2, "First name is required."),
  middleName: z.string().optional(),
  surname: z.string().min(2, "Surname is required."),
  username: z.string().min(4, "Username must be at least 4 characters."),
  email: z.string().email("Please enter a valid email address."),
  phoneNo: z.string().min(10, "Phone number must be at least 10 digits."),
});

type NewAdminForm = z.infer<typeof newAdminSchema>;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function ManagementPage() {
  const { user, setUser, admins, setAdmins, isEnrollmentOpen, setIsEnrollmentOpen } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const addAdminForm = useForm<NewAdminForm>({
    resolver: zodResolver(newAdminSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      surname: "",
      username: "",
      email: "",
      phoneNo: "",
    }
  });

  const changePasswordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  });

  useEffect(() => {
    if (!user || user?.role !== "Admin" || !user.isChiefAdmin) {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (!user || user?.role !== "Admin" || !user.isChiefAdmin) {
    return null;
  }

  const schoolAdmins = admins.filter(a => a.schoolId === user.schoolId);

  const handleAddAdmin = (data: NewAdminForm) => {
    if (schoolAdmins.length >= 3) {
      toast({
        variant: "destructive",
        title: "Admin Limit Reached",
        description: "You cannot add more than 3 administrators.",
      });
      return;
    }

    if (admins.some(admin => admin.username === data.username)) {
        addAdminForm.setError("username", { message: "This username is already taken." });
        return;
    }
     if (admins.some(admin => admin.email === data.email)) {
        addAdminForm.setError("email", { message: "This email is already taken." });
        return;
    }

    const newAdmin: User = {
      name: `${data.firstName} ${data.surname}`,
      role: "Admin",
      avatar: `https://i.pravatar.cc/150?u=${data.email}`,
      isChiefAdmin: false,
      ...data,
      password: data.phoneNo, // Phone number as password
      schoolId: user.schoolId,
      schoolName: user.schoolName,
      status: 'Active',
    };
    
    setAdmins(prev => [...prev, newAdmin]);

    toast({
      title: "Admin Added",
      description: `${newAdmin.name} has been added as an administrator.`,
    });
    addAdminForm.reset();
  };

  const handleRemoveAdmin = (email: string) => {
    const adminToRemove = admins.find(a => a.email === email);
    if (adminToRemove?.isChiefAdmin) {
      toast({
        variant: "destructive",
        title: "Action Forbidden",
        description: "The Chief Admin cannot be removed.",
      });
      return;
    }
    if(adminToRemove?.email) {
      setAdmins(prev => prev.filter(a => a.email !== email));
      toast({
        title: "Admin Removed",
        description: `The administrator '${adminToRemove.name}' has been removed.`,
      });
    }
  };

  const handleChangePassword = (data: ChangePasswordForm) => {
    if (!user || data.currentPassword !== user.password) {
        changePasswordForm.setError("currentPassword", { type: 'manual', message: "Incorrect current password."});
        return;
    }
    
    const updatedUser = { ...user, password: data.newPassword };
    
    setAdmins(prevAdmins => prevAdmins.map(admin => admin.email === user.email ? updatedUser : admin));
    setUser(updatedUser);

    toast({
      title: "Password Updated",
      description: "Your password has been changed successfully.",
    });
    changePasswordForm.reset();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Add or remove administrators and manage your account.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <Settings /> School Settings
                    </CardTitle>
                    <CardDescription>Manage general settings for your school.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Switch id="enrollment-toggle" checked={isEnrollmentOpen} onCheckedChange={setIsEnrollmentOpen} />
                        <Label htmlFor="enrollment-toggle">Enable Student Enrollment</Label>
                    </div>
                     <p className="text-xs text-muted-foreground mt-2">
                        When enabled, staff can access the enrollment page to register new students.
                    </p>
                </CardContent>
            </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                <UserPlus /> Add New Admin
              </CardTitle>
              <CardDescription>Create a new administrator account.</CardDescription>
            </CardHeader>
            <CardContent>
                {schoolAdmins.length < 3 ? (
                    <Form {...addAdminForm}>
                        <form onSubmit={addAdminForm.handleSubmit(handleAddAdmin)} className="space-y-4">
                            <FormField control={addAdminForm.control} name="firstName" render={({ field }) => (
                                <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="e.g., John" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={addAdminForm.control} name="middleName" render={({ field }) => (
                                <FormItem><FormLabel>Middle Name (Optional)</FormLabel><FormControl><Input placeholder="e.g., Fitzgerald" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={addAdminForm.control} name="surname" render={({ field }) => (
                                <FormItem><FormLabel>Surname</FormLabel><FormControl><Input placeholder="e.g., Doe" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={addAdminForm.control} name="username" render={({ field }) => (
                                <FormItem><FormLabel>Username (Legacy)</FormLabel><FormControl><Input placeholder="e.g., j.doe" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={addAdminForm.control} name="email" render={({ field }) => (
                                <FormItem><FormLabel>Email (Login ID)</FormLabel><FormControl><Input type="email" placeholder="e.g., j.doe@school.com" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={addAdminForm.control} name="phoneNo" render={({ field }) => (
                                <FormItem><FormLabel>Phone Number (as Password)</FormLabel><FormControl><Input type="tel" placeholder="08012345678" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <Button type="submit" className="w-full" disabled={addAdminForm.formState.isSubmitting}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Administrator
                            </Button>
                        </form>
                    </Form>
                ) : (
                    <Alert>
                        <ShieldCheck className="h-4 w-4" />
                        <AlertTitle>Admin Limit Reached</AlertTitle>
                        <AlertDescription>You have reached the maximum of 3 administrators for your school.</AlertDescription>
                    </Alert>
                )}
            </CardContent>
          </Card>
          
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                <KeyRound /> Change Password
              </CardTitle>
              <CardDescription>Update your own login password.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...changePasswordForm}>
                    <form onSubmit={changePasswordForm.handleSubmit(handleChangePassword)} className="space-y-4">
                        <FormField control={changePasswordForm.control} name="currentPassword" render={({ field }) => (
                            <FormItem><FormLabel>Current Password</FormLabel><FormControl><Input type="password" placeholder="********" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={changePasswordForm.control} name="newPassword" render={({ field }) => (
                            <FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" placeholder="********" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={changePasswordForm.control} name="confirmPassword" render={({ field }) => (
                            <FormItem><FormLabel>Confirm New Password</FormLabel><FormControl><Input type="password" placeholder="********" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <Button type="submit" className="w-full" disabled={changePasswordForm.formState.isSubmitting}>
                           Update Password
                        </Button>
                    </form>
                </Form>
            </CardContent>
          </Card>

        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Current Administrators</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Login ID (Email)</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schoolAdmins.map((admin) => (
                    <TableRow key={admin.email}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={admin.avatar} alt={admin.name} data-ai-hint="person" />
                            <AvatarFallback>{admin.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{admin.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell className="font-mono text-xs">{admin.isChiefAdmin ? "Custom" : admin.phoneNo}</TableCell>
                      <TableCell>
                        {admin.isChiefAdmin ? (
                          <span className="font-bold text-primary">Chief Admin</span>
                        ) : (
                          "Admin"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!admin.isChiefAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveAdmin(admin.email!)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        )}
                      </TableCell>
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
