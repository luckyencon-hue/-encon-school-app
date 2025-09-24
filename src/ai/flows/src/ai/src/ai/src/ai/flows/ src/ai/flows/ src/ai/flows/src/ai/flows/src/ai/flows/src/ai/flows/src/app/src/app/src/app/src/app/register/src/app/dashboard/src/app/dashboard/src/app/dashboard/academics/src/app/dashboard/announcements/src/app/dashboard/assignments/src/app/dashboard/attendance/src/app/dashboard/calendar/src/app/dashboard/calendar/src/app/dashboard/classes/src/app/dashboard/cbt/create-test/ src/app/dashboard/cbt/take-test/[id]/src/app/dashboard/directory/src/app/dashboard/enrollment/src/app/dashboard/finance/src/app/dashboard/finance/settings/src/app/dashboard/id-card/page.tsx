// src/app/dashboard/id-card/page.tsx
"use client";

import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { useEffect } from "react";

export default function IdCardPage() {
  const { user, schoolClasses } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== "Student") {
      router.push("/dashboard");
    }
  }, [user, router]);
  
  if (!user || user.role !== "Student") {
    return null;
  }
  
  const studentClass = schoolClasses.find(c => c.id === user.classId);

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Digital ID Card</h1>
        <p className="text-muted-foreground">
          Your official student identification card.
        </p>
      </div>

      <div className="max-w-sm mx-auto">
        <Card className="rounded-2xl shadow-lg overflow-hidden border-2 border-primary/20">
            <CardContent className="p-0">
                <div className="bg-primary/10 p-6 relative">
                    <div className="absolute top-4 right-4">
                        <Icons.Logo className="h-10 w-10" />
                    </div>
                    <div className="flex flex-col items-center pt-8">
                        <Avatar className="h-32 w-32 border-4 border-white shadow-md">
                            <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person" />
                            <AvatarFallback className="text-4xl">{user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-2xl font-bold font-headline mt-4">{user.name}</h2>
                        <p className="text-muted-foreground">{user.regNo}</p>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Class</p>
                            <p className="font-semibold">{studentClass?.name || 'N/A'}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Expires</p>
                            <p className="font-semibold">08/2025</p>
                        </div>
                         <div className="text-center">
                            <p className="text-xs text-muted-foreground">D.O.B</p>
                            <p className="font-semibold">{user.dob ? new Date(user.dob).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>
                     <div className="flex items-center justify-center pt-4 border-t">
                        <Image
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${user.regNo}`}
                            alt="Student QR Code"
                            width={150}
                            height={150}
                            data-ai-hint="qr code"
                        />
                    </div>
                </div>
                 <div className="bg-primary text-primary-foreground text-center p-2 font-bold text-sm">
                    STUDENT
                </div>
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
