// src/app/dashboard/attendance/page.tsx
'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useUser, type TeacherAttendanceRecord, type TeacherAttendanceLog } from '@/context/user-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type Student, type User } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { QrCode, Save, Clock, LogOut, CheckCircle, AlertCircle, UserCheck, UserX, CalendarX2, Camera, Video, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import type { AttendanceRecord } from '@/context/user-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import jsQR from 'jsqr';

const EarlyDepartureDialog = ({ onConfirm }: { onConfirm: (reason: string) => void }) => {
  const [reason, setReason] = useState('');
  
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Request Early Departure</DialogTitle>
        <DialogDescription>
          Please provide a reason for leaving before the official closing time. This will be logged for administrative review.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <Label htmlFor="reason">Reason for Departure</Label>
        <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Personal emergency, doctor's appointment..." />
      </div>
      <DialogFooter>
        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
        <DialogClose asChild><Button onClick={() => onConfirm(reason)} disabled={!reason.trim()}>Submit Request</Button></DialogClose>
      </DialogFooter>
    </DialogContent>
  )
}

const QRCodeScannerDialog = ({ onScanSuccess, expectedQrData }: { onScanSuccess: () => void, expectedQrData: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const { toast } = useToast();
    const [scanResult, setScanResult] = useState('');

    const tick = useCallback(() => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
            setIsScanning(true);
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'dontInvert',
                });

                if (code) {
                    setScanResult(code.data);
                    if (code.data === expectedQrData) {
                        onScanSuccess();
                    } else {
                        toast({
                            variant: 'destructive',
                            title: 'Invalid QR Code',
                            description: 'The scanned QR code is not valid for this school.'
                        });
                    }
                }
            }
        }
        requestAnimationFrame(tick);
    }, [expectedQrData, onScanSuccess, toast]);

    useEffect(() => {
        const getCameraPermission = async () => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setHasCameraPermission(false);
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                setHasCameraPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                requestAnimationFrame(tick);
            } catch (error) {
                console.error('Error accessing camera:', error);
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Please enable camera permissions in your browser settings to clock-in.',
                });
            }
        };

        getCameraPermission();
        
        return () => {
             if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        }
    }, [toast, tick]);

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Scan QR Code to Clock-In</DialogTitle>
                <DialogDescription>Point your camera at the QR code provided at the school entrance.</DialogDescription>
            </DialogHeader>
            <div className="relative bg-muted rounded-md flex items-center justify-center aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover rounded-md" autoPlay muted playsInline />
                <canvas ref={canvasRef} className="hidden" />

                {isScanning && !scanResult && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-background/50">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-sm font-semibold mt-2">Scanning...</p>
                    </div>
                )}
                 {hasCameraPermission === false && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-background/80">
                        <Video className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-semibold">Camera Not Available</p>
                        <p className="text-xs text-muted-foreground">Please allow camera access in your browser settings.</p>
                    </div>
                )}
            </div>
            <DialogFooter>
                 <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
    );
};


export default function AttendancePage() {
  const { 
    user, schoolClasses, attendance, setAttendance, holidays, setHolidays, 
    staff, teacherAttendance, setTeacherAttendance, resumptionTime, closureTime 
  } = useUser();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  const todayKey = useMemo(() => selectedDate ? selectedDate.toISOString().split('T')[0] : '', [selectedDate]);
  
  const [draftAttendance, setDraftAttendance] = useState<AttendanceRecord>({});

  const qrCodeData = useMemo(() => {
    if (!user?.schoolId) return 'invalid-school';
    return `ENCON-CLOCK-IN:${user.schoolId}`;
  }, [user?.schoolId]);
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeData)}`;
  const qrCodeDownloadUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeData)}`;


  useEffect(() => {
    // When the date changes, load the existing attendance for that day into the draft state.
    setDraftAttendance(attendance[todayKey] || {});
  }, [todayKey, attendance]);

  const handleSaveQRCode = async () => {
    try {
      const response = await fetch(qrCodeDownloadUrl);
      if (!response.ok) throw new Error('Network response was not ok.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `staff-clock-in-qr-${user?.schoolId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: 'QR Code Saved', description: 'The QR code has been downloaded successfully.' });
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Could not save the QR code. Please try again or take a screenshot.',
      });
    }
  };

  const isHoliday = useMemo(() => {
    if (!selectedDate) return false;
    const day = selectedDate.getDay();
    const isWeekend = day === 0 || day === 6;
    const isMarkedHoliday = holidays.some(h => h.toDateString() === selectedDate.toDateString());
    return isWeekend || isMarkedHoliday;
  }, [selectedDate, holidays]);

  const handleToggleHoliday = () => {
    if (!selectedDate) return;
    setHolidays(prev => {
      const isAlreadyHoliday = prev.some(h => h.toDateString() === selectedDate.toDateString());
      if (isAlreadyHoliday) {
        return prev.filter(h => h.toDateString() !== selectedDate.toDateString());
      }
      return [...prev, selectedDate];
    });
  };

  const handleAttendanceChange = (studentRegNo: string, session: 'morning' | 'afternoon', status: boolean) => {
    setDraftAttendance(prev => {
      const studentAttendance = prev[studentRegNo] || { morning: 'absent', afternoon: 'absent' };
      return {
        ...prev,
        [studentRegNo]: {
          ...studentAttendance,
          [session]: status ? 'present' : 'absent',
        },
      };
    });
  };

  const handleSubmitAttendance = () => {
    setAttendance(prev => ({
      ...prev,
      [todayKey]: draftAttendance,
    }));
    toast({
      title: 'Attendance Submitted',
      description: `Student attendance for ${selectedDate?.toLocaleDateString()} has been saved.`,
    });
  };

  const handleClockAction = useCallback((action: 'clock-in' | 'clock-out' | 'early-departure', reason = '') => {
    if (!user || !user.email) return;

    const now = new Date();
    const isLate = now > new Date(now.toDateString() + ' ' + resumptionTime);
    const isEarly = now < new Date(now.toDateString() + ' ' + closureTime);

    let userRecordUpdate: Partial<TeacherAttendanceRecord> = {};
    let toastTitle = '';
    let toastDescription = '';

    if (action === 'clock-in') {
        userRecordUpdate = { checkIn: now, status: isLate ? 'Late' : 'On Time' };
        toastTitle = 'Clocked In';
        toastDescription = `You have been clocked in at ${now.toLocaleTimeString()}.`;
    } else if (action === 'clock-out') {
        if(isEarly) {
            toast({ variant: 'destructive', title: 'Cannot Clock Out', description: `Closing time is ${closureTime}. Please use the early departure option if needed.`});
            return;
        }
        userRecordUpdate = { checkOut: now };
        toastTitle = 'Clocked Out';
        toastDescription = `You have been clocked out at ${now.toLocaleTimeString()}.`;
    } else if (action === 'early-departure') {
        userRecordUpdate = { checkOut: now, status: 'Early Departure', reason: reason };
        toastTitle = 'Early Departure Logged';
        toastDescription = 'Your departure has been recorded.';
    }

    setTeacherAttendance(prev => {
      const newLog = { ...prev };
      const dayLog = newLog[todayKey] ? { ...newLog[todayKey] } : {};
      const currentUserRecord = dayLog[user.email!] || { status: 'Absent', reason: '' };
      
      dayLog[user.email!] = { ...currentUserRecord, ...userRecordUpdate };
      newLog[todayKey] = dayLog;
      return newLog;
    });

    if (toastTitle) {
      toast({ title: toastTitle, description: toastDescription });
    }
  }, [user, setTeacherAttendance, todayKey, resumptionTime, closureTime, toast]);
  
  if (!user) return null;
  const isAdmin = user.role === 'Admin';
  const isChiefAdmin = isAdmin && user.isChiefAdmin;
  const isStaffMember = user.role === 'Staff';

  const staffClass = useMemo(() => {
    if (!isStaffMember) return undefined;
    return schoolClasses.find(c => c.teacher === user.name);
  }, [isStaffMember, schoolClasses, user.name]);

  const teacherLogForToday = teacherAttendance[todayKey]?.[user.email!] || null;


  const renderStudentRegister = (students: Student[]) => (
    <Card>
      <CardHeader>
        <CardTitle>Student Register</CardTitle>
        <CardDescription>Mark attendance for morning and afternoon sessions.</CardDescription>
      </CardHeader>
      <CardContent>
        {isHoliday ? (
            <Alert>
                <CalendarX2 className="h-4 w-4"/>
                <AlertTitle>Weekend or Public Holiday</AlertTitle>
                <AlertDescription>Student attendance cannot be marked today.</AlertDescription>
            </Alert>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="text-center">Morning</TableHead>
              <TableHead className="text-center">Afternoon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map(student => {
              const studentAttendance = draftAttendance[student.regNo] || { morning: 'absent', afternoon: 'absent' };
              return (
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
                  <TableCell className="text-center">
                    <Checkbox 
                        checked={studentAttendance.morning === 'present'}
                        onCheckedChange={(checked) => handleAttendanceChange(student.regNo, 'morning', !!checked)}
                        disabled={isHoliday}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                        checked={studentAttendance.afternoon === 'present'}
                        onCheckedChange={(checked) => handleAttendanceChange(student.regNo, 'afternoon', !!checked)}
                        disabled={isHoliday}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        )}
      </CardContent>
      {!isHoliday && (
        <CardFooter>
            <Button onClick={handleSubmitAttendance} disabled={JSON.stringify(draftAttendance) === JSON.stringify(attendance[todayKey] || {})}>
                <Save className="mr-2 h-4 w-4" />
                Submit Attendance
            </Button>
        </CardFooter>
      )}
    </Card>
  );

  const renderStaffAttendance = () => (
    <>
      {isChiefAdmin && (
        <Card>
            <div className="p-6">
                <div className="space-y-2 text-center">
                    <QrCode className="mx-auto h-12 w-12" />
                    <h3 className="font-headline text-lg font-semibold">Staff Check-in QR Code</h3>
                    <p className="text-muted-foreground text-sm">Post this QR code at the school entrance for staff to scan upon arrival.</p>
                </div>
                <div className="flex items-center justify-center p-4">
                   <Image
                        src={qrCodeUrl}
                        alt="Attendance QR Code"
                        width={200}
                        height={200}
                        data-ai-hint="qr code"
                   />
                </div>
            </div>
            <CardFooter>
                <Button variant="outline" onClick={handleSaveQRCode}>
                    <Save className="mr-2 h-4 w-4" />
                    Save QR Code
                </Button>
            </CardFooter>
        </Card>
      )}

      {isStaffMember && (
        <Card>
          <CardHeader>
            <CardTitle>Your Attendance Today</CardTitle>
            <CardDescription>
              {`Scan the QR code to clock-in. Resumption time: ${resumptionTime}. Closure time: ${closureTime}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Dialog>
                <DialogTrigger asChild>
                    <Button disabled={!!teacherLogForToday?.checkIn || isHoliday} className="w-full">
                        <UserCheck className="mr-2" /> {teacherLogForToday?.checkIn ? `Clocked In at ${new Date(teacherLogForToday.checkIn).toLocaleTimeString()}` : 'Scan to Clock-In'}
                    </Button>
                </DialogTrigger>
                <QRCodeScannerDialog onScanSuccess={() => handleClockAction('clock-in')} expectedQrData={qrCodeData} />
            </Dialog>

            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" disabled={!teacherLogForToday?.checkIn || !!teacherLogForToday?.checkOut || isHoliday} className="w-full">
                      <LogOut className="mr-2" /> Request Early Departure
                    </Button>
                </DialogTrigger>
                <EarlyDepartureDialog onConfirm={(reason) => handleClockAction('early-departure', reason)} />
              </Dialog>
              <Button onClick={() => handleClockAction('clock-out')} disabled={!teacherLogForToday?.checkIn || !!teacherLogForToday?.checkOut || isHoliday} className="w-full">
                <Clock className="mr-2" /> {teacherLogForToday?.checkOut ? `Clocked Out at ${new Date(teacherLogForToday.checkOut).toLocaleTimeString()}` : 'Clock-Out'}
              </Button>
            </div>
             {isHoliday && <Alert><CalendarX2 className="h-4 w-4"/><AlertTitle>Today is a Weekend/Holiday</AlertTitle><AlertDescription>Attendance is not required today.</AlertDescription></Alert>}
          </CardContent>
        </Card>
      )}

      <Card className="mt-8">
          <CardHeader>
            <CardTitle>Staff Attendance Log for {selectedDate?.toLocaleDateString()}</CardTitle>
            <CardDescription>Overview of staff attendance for the selected date.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Reason</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.filter(t => t.schoolId === user?.schoolId).map(staffMember => {
                  const log = teacherAttendance[todayKey]?.[staffMember.email!];
                  return (
                    <TableRow key={staffMember.email}>
                      <TableCell>
                         <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                              <AvatarImage src={staffMember.avatar} alt={staffMember.name} data-ai-hint="person" />
                              <AvatarFallback>{staffMember.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{staffMember.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{log?.checkIn ? new Date(log.checkIn).toLocaleTimeString() : '--:--'}</TableCell>
                      <TableCell>{log?.checkOut ? new Date(log.checkOut).toLocaleTimeString() : '--:--'}</TableCell>
                      <TableCell>
                        {isHoliday ? (
                             <Badge variant="secondary">Holiday</Badge>
                        ) : log?.status ? (
                          <Badge variant={log.status === 'Late' || log.status === 'Early Departure' ? 'destructive' : 'default'}
                            className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 data-[variant=destructive]:bg-red-100 data-[variant=destructive]:text-red-800 dark:data-[variant=destructive]:bg-red-900/20 dark:data-[variant=destructive]:text-red-300"
                          >
                           {log.status === 'On Time' && <CheckCircle className="mr-1 h-3 w-3" />}
                           {log.status !== 'On Time' && log.status !== 'Absent' && <AlertCircle className="mr-1 h-3 w-3" />}
                           {log.status}
                          </Badge>
                        ) : 'Absent'}
                      </TableCell>
                       {isAdmin && <TableCell className="text-xs text-muted-foreground">{log?.reason || 'N/A'}</TableCell>}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
      </Card>
    </>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">Manage daily attendance for staff and students.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Select Date</CardTitle>
                </CardHeader>
                <CardContent>
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date > new Date()}
                        modifiers={{ 
                            holidays: holidays,
                            weekend: { daysOfWeek: [0, 6] }
                        }}
                        modifiersClassNames={{ 
                            holidays: 'bg-destructive/20 text-destructive-foreground',
                            weekend: 'text-muted-foreground/50'
                        }}
                        className="p-0"
                    />
                </CardContent>
            </Card>
            {isAdmin && (
                <Card>
                    <CardHeader>
                        <CardTitle>Holiday Management</CardTitle>
                        <CardDescription>Mark selected non-weekend dates as public holidays.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            onClick={handleToggleHoliday} 
                            className="w-full" 
                            disabled={!selectedDate || selectedDate.getDay() === 0 || selectedDate.getDay() === 6}
                        >
                            {holidays.some(h => h.toDateString() === selectedDate?.toDateString()) ? 'Unmark as Holiday' : 'Mark as Holiday'}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
        <div className="md:col-span-2">
            <Tabs defaultValue={staffClass ? 'student' : 'teacher'}>
                <TabsList>
                    {staffClass && <TabsTrigger value="student">Student Attendance</TabsTrigger>}
                    <TabsTrigger value="teacher">Staff Attendance</TabsTrigger>
                </TabsList>
                <TabsContent value="teacher" className="mt-4">
                    {renderStaffAttendance()}
                </TabsContent>
                 {staffClass && (
                    <TabsContent value="student" className="mt-4">
                        {renderStudentRegister(staffClass.students)}
                    </TabsContent>
                 )}
                  {!staffClass && isStaffMember && (
                     <TabsContent value="teacher" className="mt-4">
                         <Alert>
                            <AlertTitle>No Class Assigned</AlertTitle>
                            <AlertDescription>
                                You are not assigned as a form teacher for any class. Student attendance taking is disabled.
                            </AlertDescription>
                        </Alert>
                    </TabsContent>
                 )}
            </Tabs>
        </div>
      </div>
    </div>
  );
}
