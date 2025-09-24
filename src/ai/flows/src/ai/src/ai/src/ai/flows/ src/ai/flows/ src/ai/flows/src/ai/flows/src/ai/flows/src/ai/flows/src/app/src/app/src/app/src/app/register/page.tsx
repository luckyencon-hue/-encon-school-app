// src/app/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser, type User } from "@/context/user-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { Loader2, ArrowLeft, Landmark, Check, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc } from "firebase/firestore";
import { defaultClassesTemplate, defaultSubjectsTemplate } from "@/lib/data";


export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { admins, setAdmins } = useUser();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: "",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleNextStep = () => {
    setError("");
     const { schoolName, adminName, adminEmail, adminPhone } = formData;
     if (!schoolName || !adminName || !adminEmail || !adminPhone) {
      setError("Please fill in all fields to continue.");
      return;
    }
     if (admins.some(admin => admin.email?.toLowerCase() === adminEmail.toLowerCase())) {
        setError("An administrator with this email already exists.");
        return;
    }
    const schoolId = schoolName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (admins.some(admin => admin.schoolId === schoolId)) {
        setError("A school with a similar name already exists. Please choose a different name.");
        return;
    }
    setStep(2);
  }

  const handleRegister = async () => {
    setError("");
    setIsRegistering(true);

    const { schoolName, adminName, adminEmail, adminPhone } = formData;

    try {
        const schoolId = schoolName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        const newAdmin: User = {
            name: adminName,
            firstName: adminName.split(' ')[0],
            surname: adminName.split(' ').slice(1).join(' '),
            email: adminEmail,
            phoneNo: adminPhone,
            password: "pending-activation",
            role: "Admin",
            avatar: `https://i.pravatar.cc/150?u=${adminEmail}`,
            isChiefAdmin: true,
            schoolId: schoolId,
            schoolName: schoolName,
            status: 'Blocked',
        };

        const batch = writeBatch(db);

        // 1. Add the new admin user
        const adminDocRef = doc(db, "admins", newAdmin.email!);
        batch.set(adminDocRef, newAdmin);

        // 2. Add default subjects for the new school
        defaultSubjectsTemplate.forEach(subject => {
            const subjectDocRef = doc(collection(db, "subjects"));
            batch.set(subjectDocRef, { ...subject, id: subjectDocRef.id, schoolId });
        });

        // 3. Add default classes for the new school
        defaultClassesTemplate.forEach(s_class => {
            const classDocRef = doc(collection(db, "schoolClasses"));
            batch.set(classDocRef, { ...s_class, id: classDocRef.id, schoolId, students: [], teacher: '', offeredSubjects: [] });
        });
        
        await batch.commit();
        
        // Also update local state for immediate UI feedback if needed
        setAdmins(prev => [...prev, newAdmin]);

        toast({
            title: "Registration Submitted!",
            description: "Your school account has been created and is pending approval from the platform owner. You will be notified upon activation.",
            duration: 9000,
        });

        router.push("/");

    } catch (err) {
      console.error("Registration Error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };
  
  const renderStepOne = () => (
     <div className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="schoolName">School Name</Label>
            <Input id="schoolName" name="schoolName" value={formData.schoolName} onChange={handleInputChange} placeholder="e.g., Bright Stars Academy" disabled={isRegistering} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="adminName">Your Full Name (Chief Admin)</Label>
            <Input id="adminName" name="adminName" value={formData.adminName} onChange={handleInputChange} placeholder="e.g., Jane Doe" disabled={isRegistering} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="adminEmail">Your Email Address</Label>
            <Input id="adminEmail" name="adminEmail" type="email" value={formData.adminEmail} onChange={handleInputChange} placeholder="e.g., admin@brightstars.com" disabled={isRegistering} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="adminPhone">Your Phone Number</Label>
            <Input id="adminPhone" name="adminPhone" type="tel" value={formData.adminPhone} onChange={handleInputChange} placeholder="e.g., 08012345678" disabled={isRegistering} />
        </div>
        
        {error && <p className="text-sm text-destructive">{error}</p>}
        
        <Button onClick={handleNextStep} className="w-full" disabled={isRegistering}>
            Next: Subscription
        </Button>
    </div>
  );

  const renderStepTwo = () => (
    <div className="space-y-4">
        <div className="text-center">
            <h3 className="font-bold text-lg">Subscription Details</h3>
            <p className="text-sm text-muted-foreground">To activate your school, please complete the subscription payment.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 text-center">
                <p className="font-bold text-xl">₦150,000</p>
                <p className="text-sm text-muted-foreground">Per Year</p>
            </Card>
             <Card className="p-4 text-center">
                <p className="font-bold text-xl">₦15,000</p>
                <p className="text-sm text-muted-foreground">Per Month</p>
            </Card>
        </div>
        
         <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader className="p-4">
                <CardTitle className="text-base font-headline flex items-center gap-2 text-blue-800 dark:text-blue-300">
                    <Landmark className="h-5 w-5" /> Bank Payment Details
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <div className="flex justify-between"><span>Account Name:</span> <span className="font-semibold">Ekwuribe Lucky chidozie</span></div>
                <div className="flex justify-between"><span>Account Number:</span> <span className="font-semibold">7037742669</span></div>
                <div className="flex justify-between"><span>Bank:</span> <span className="font-semibold">Moniepoint MFB</span></div>
            </CardContent>
        </Card>

        <div className="pt-4 space-y-3">
             <div className="flex items-center space-x-2">
                <Checkbox id="payment-confirmation" checked={paymentConfirmed} onCheckedChange={(checked) => setPaymentConfirmed(checked as boolean)} />
                <label
                    htmlFor="payment-confirmation"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    I have made the payment for the subscription.
                </label>
            </div>
            <p className="text-xs text-muted-foreground">After payment, your account will be created with a 'Blocked' status. The platform owner will verify your payment and activate your school's account within 24 hours.</p>
        </div>

        <Button onClick={handleRegister} className="w-full" disabled={isRegistering || !paymentConfirmed}>
            {isRegistering ? <Loader2 className="animate-spin" /> : <ShieldCheck className="mr-2" />}
            Complete Registration
        </Button>
         <Button variant="outline" onClick={() => setStep(1)} className="w-full">
            Back
        </Button>
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="w-full max-w-md">
            <Button variant="ghost" asChild className="mb-4">
                <Link href="/"><ArrowLeft className="mr-2"/> Back to Login</Link>
            </Button>
            <Card className="w-full shadow-xl">
                <CardHeader className="text-center">
                    <Icons.Logo className="h-12 w-12 mx-auto" />
                    <CardTitle className="text-2xl font-headline mt-2">Register Your School</CardTitle>
                    <CardDescription>Join the encon concept platform today.</CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 1 ? renderStepOne() : renderStepTwo()}
                </CardContent>
            </Card>
        </div>
    </main>
  );
}
