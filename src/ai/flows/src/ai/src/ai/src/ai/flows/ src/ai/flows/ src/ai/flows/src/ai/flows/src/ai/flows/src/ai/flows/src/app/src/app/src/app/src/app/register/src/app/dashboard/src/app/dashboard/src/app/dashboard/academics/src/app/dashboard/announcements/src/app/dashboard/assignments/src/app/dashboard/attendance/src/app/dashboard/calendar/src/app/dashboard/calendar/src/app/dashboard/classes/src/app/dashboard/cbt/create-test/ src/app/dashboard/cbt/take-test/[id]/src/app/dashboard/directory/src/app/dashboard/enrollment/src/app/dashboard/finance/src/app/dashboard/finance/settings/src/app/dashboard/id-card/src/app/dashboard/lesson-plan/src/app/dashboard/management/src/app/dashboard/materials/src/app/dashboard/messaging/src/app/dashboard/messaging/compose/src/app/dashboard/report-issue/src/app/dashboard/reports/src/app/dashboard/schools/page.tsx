// src/app/dashboard/schools/page.tsx
"use client";

import { useUser, type User } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building, ShieldAlert, CheckCircle, XCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";

export default function SchoolsPage() {
  const { user, admins, setAdmins, setUser } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // This page is strictly for the platform owner
    if (!user || user.schoolId !== 'encon-initial') {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (!user || user.schoolId !== 'encon-initial') {
    return null;
  }
  
  const handleSchoolAction = async (schoolId: string, action: 'activate' | 'block', adminEmail: string, adminName: string) => {
    
    // Simulate async action
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (action === 'activate') {
        const newPassword = Math.random().toString(36).slice(-8);
        setAdmins(prevAdmins =>
            prevAdmins.map(admin =>
            admin.schoolId === schoolId && admin.isChiefAdmin ? { ...admin, status: 'Active', password: newPassword } : admin
            )
        );
        toast({
            title: "School Activated",
            description: `An email with the new password "${newPassword}" has been sent to ${adminName} at ${adminEmail}.`,
            duration: 9000,
        });
    } else { // 'block' action
        setAdmins(prevAdmins =>
            prevAdmins.map(admin =>
            admin.schoolId === schoolId && admin.isChiefAdmin ? { ...admin, status: 'Blocked' } : admin
            )
        );
        toast({
            variant: 'destructive',
            title: "School Blocked",
            description: `The school has been blocked and its administrators can no longer log in.`,
        });
    }
  };

  const handleLoginAs = (schoolAdmin: User) => {
    setUser(schoolAdmin);
    router.push('/dashboard');
    toast({
      title: "Switched School",
      description: `You are now managing ${schoolAdmin.schoolName}.`,
    });
  };

  // Filter out the platform owner's own "school" entry and get unique schools
  const registeredSchools = admins.filter(admin => admin.schoolId !== 'encon-initial' && admin.isChiefAdmin);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
          <Building /> Registered Schools
        </h1>
        <p className="text-muted-foreground">
          View and manage all schools that have registered on the platform.
        </p>
      </div>

       <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Platform Owner View</AlertTitle>
        <AlertDescription>
          This page is only visible to you as the primary platform administrator. You can manage school access from here.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Schools List</CardTitle>
          <CardDescription>
            A total of {registeredSchools.length} school(s) have registered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School Name</TableHead>
                <TableHead>Chief Administrator</TableHead>
                <TableHead>Admin Email</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registeredSchools.length > 0 ? (
                registeredSchools.map((school) => {
                  const isActive = school.status === 'Active';
                  return (
                    <TableRow key={school.email}>
                      <TableCell className="font-medium">{school.schoolName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={school.avatar} alt={school.name} data-ai-hint="person" />
                            <AvatarFallback>{school.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{school.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{school.email}</TableCell>
                      <TableCell className="font-mono text-xs">{school.password}</TableCell>
                      <TableCell>
                          <Badge variant={isActive ? 'default' : 'destructive'} className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 data-[variant=destructive]:bg-red-100 data-[variant=destructive]:text-red-800 dark:data-[variant=destructive]:bg-red-900/20 dark:data-[variant=destructive]:text-red-300">
                            {isActive ? 'Active' : 'Blocked'}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleLoginAs(school)}>
                            <LogIn className="mr-2 h-4 w-4" /> Login as Admin
                        </Button>
                        {isActive ? (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleSchoolAction(school.schoolId!, 'block', school.email!, school.name)}
                          >
                            <XCircle className="mr-2 h-4 w-4" /> Block
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleSchoolAction(school.schoolId!, 'activate', school.email!, school.name)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" /> Activate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    No schools have registered yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
