"use client";

import { useUser } from "@/context/user-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { announcements, Student, Grade, SchoolClass } from "@/lib/data";
import AnnouncementCard from "@/components/dashboard/announcement-card";
import { Calendar, Megaphone, BookOpen, BarChart3, CheckCircle, Info, BookCheck, Users, DollarSign, FileText } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, CartesianGrid, XAxis, YAxis, Bar, LineChart, Line, Tooltip } from "recharts";


const calculateTotalScore = (grades?: Grade[]) => {
  if (!grades || grades.length === 0) return 0;
  const total = grades.reduce((acc, grade) => {
    const gradeTotal = (grade.firstCA || 0) + (grade.secondCA || 0) + (grade.project || 0) + (grade.exam || 0);
    return acc + gradeTotal;
  }, 0);
  const average = total / grades.length;
  return isNaN(average) ? 0 : average;
};

const getRemark = (avg: number) => {
    if (avg >= 75) return "Excellent";
    if (avg >= 60) return "Good";
    if (avg >= 50) return "Satisfactory";
    return "Needs Improvement";
  };

export default function DashboardPage() {
  const { user, students, schoolClasses, assignments, cbtTests, isEnrollmentOpen } = useUser();
  const recentAnnouncements = announcements.slice(0, 2);

  if (!user) return null;

  const getStudentDetails = () => {
    if (user.role !== 'Student' && user.role !== 'Parent') return null;
    const studentRegNo = user.regNo;
    if (!studentRegNo) return null;
    
    const studentData = students.find(s => s.regNo === studentRegNo);
    if (!studentData) return null;

    const studentClass = schoolClasses.find(c => c.id === studentData.classId);
    const studentAverage = calculateTotalScore(studentData.grades);
    const studentRemark = getRemark(studentAverage);
    const studentAssignments = assignments.filter(a => a.classId === studentData.classId);
    const availableTests = cbtTests.filter(t => t.classId === studentData.classId && t.status === 'Open');
    
    return {
        studentData,
        studentClass,
        studentAverage,
        studentRemark,
        studentAssignments,
        availableTests
    };
  }
  
   const getAdminDetails = () => {
      const enrollmentData = schoolClasses.map(c => ({
        name: c.name,
        students: c.students.length,
      }));

      const totalFees = students.reduce((sum, s) => sum + (s.fees?.totalFees || 0), 0);
      const totalPaid = students.reduce((sum, s) => sum + (s.fees?.amountPaid || 0), 0);
      const financeData = [
        { name: 'Total Fees', value: totalFees },
        { name: 'Total Paid', value: totalPaid },
        { name: 'Outstanding', value: totalFees - totalPaid },
      ];
      return { enrollmentData, financeData };
   }

  const studentDetails = getStudentDetails();
  const adminDetails = (user.role === 'Admin' || user.role === 'Staff') ? getAdminDetails() : null;


  const renderAdminStaffDashboard = () => (
     <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            {(isEnrollmentOpen || user.isChiefAdmin) && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2"><Users className="h-5 w-5"/> Enrollment Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{ students: { label: "Students", color: "hsl(var(--primary))" } }} className="h-64 w-full">
                    <BarChart data={adminDetails?.enrollmentData} accessibilityLayer>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="students" fill="var(--color-students)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
             <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><DollarSign className="h-5 w-5"/> Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                 <ChartContainer config={{ value: { label: "Amount (NGN)", color: "hsl(var(--accent))" } }} className="h-64 w-full">
                   <BarChart data={adminDetails?.financeData} layout="vertical" accessibilityLayer>
                      <CartesianGrid horizontal={false} />
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} className="w-24" />
                      <XAxis type="number" />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                   </BarChart>
                 </ChartContainer>
              </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
           <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl font-headline">
                  <Megaphone className="h-5 w-5" />
                  Recent Announcements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentAnnouncements.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                  />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-headline">
                  <Calendar className="h-5 w-5" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CalendarComponent
                  mode="single"
                  selected={new Date()}
                  className="p-0"
                  classNames={{
                    head_cell: "w-full",
                    day: "h-9 w-full",
                  }}
                />
                <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <p><span className="font-semibold">Today:</span> Mid-term presentations</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-accent" />
                        <p>No upcoming deadlines.</p>
                    </div>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
  );
  
  const renderStudentDashboard = () => {
    if (!studentDetails) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Welcome!</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Your academic data is not available yet. This could be because you are not yet assigned to a class. Please check back later.</p>
                </CardContent>
             </Card>
        );
    }
    const { studentData, studentClass, studentAverage, studentRemark, studentAssignments, availableTests } = studentDetails;
    const performanceData = (studentData.grades || []).map(g => ({
        name: g.subject,
        score: (g.firstCA || 0) + (g.secondCA || 0) + (g.project || 0) + (g.exam || 0)
    }));
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Academic Snapshot</CardTitle>
                    <CardDescription>A quick summary of your current academic standing.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><BookOpen size={14}/> Current Class</p>
                        <p className="text-xl font-bold">{studentClass?.name || 'Not Assigned'}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><BarChart3 size={14}/> Overall Average</p>
                        <p className="text-xl font-bold">{studentAverage.toFixed(2)}%</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><CheckCircle size={14}/> General Remark</p>
                        <p className="text-xl font-bold">{studentRemark}</p>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><BarChart3/> Performance by Subject</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ score: { label: "Score", color: "hsl(var(--primary))" } }} className="h-[150px] w-full">
                  <LineChart data={performanceData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} accessibilityLayer>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                       <FileText className="h-5 w-5"/> CBT Tests
                    </CardTitle>
                    <CardDescription>You have {availableTests.length} test(s) available.</CardDescription>
                </CardHeader>
                <CardContent>
                    {availableTests.length > 0 ? (
                        <div className="space-y-2">
                             <p className="text-sm text-muted-foreground">Click the button below to go to the CBT platform and start your test.</p>
                             <Button asChild className="w-full">
                                <Link href="/dashboard/cbt">Go to CBT Platform</Link>
                             </Button>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-muted-foreground">
                            <p>No tests are currently open for you. Check back later!</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                       <BookCheck className="h-5 w-5"/> Upcoming Assignments
                    </CardTitle>
                    <CardDescription>You have {studentAssignments.length} pending assignment(s).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {studentAssignments.length > 0 ? studentAssignments.slice(0, 2).map(assignment => (
                        <div key={assignment.id} className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-semibold text-primary text-sm">{assignment.subject}</p>
                            <p className="font-medium leading-tight">{assignment.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                        </div>
                    )) : (
                        <div className="text-center py-4 text-muted-foreground">
                            <p>No upcoming assignments. Great job!</p>
                        </div>
                    )}
                    {studentAssignments.length > 0 && (
                        <Button asChild variant="secondary" size="sm" className="w-full mt-2">
                            <Link href="/dashboard/assignments">View All Assignments</Link>
                        </Button>
                    )}
                </CardContent>
            </Card>

            <Card className="md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl font-headline">
                    <Megaphone className="h-5 w-5" />
                    Recent Announcements
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    {recentAnnouncements.length > 0 ? recentAnnouncements.map((announcement) => (
                    <AnnouncementCard
                        key={announcement.id}
                        announcement={announcement}
                    />
                    )) : (
                        <div className="text-center py-8 text-muted-foreground sm:col-span-2">
                            <Info className="mx-auto h-10 w-10 mb-2"/>
                            <p>No new announcements at this time.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        {user.avatar && (
            <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person" />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
        )}
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">
            Welcome back, {user.name.split(" ")[0]}!
            </h1>
            <p className="text-muted-foreground">
            Here's what's happening around the school today.
            </p>
        </div>
      </div>

      {(user.role === 'Student' || user.role === 'Parent') ? renderStudentDashboard() : renderAdminStaffDashboard()}

    </div>
  );
}
