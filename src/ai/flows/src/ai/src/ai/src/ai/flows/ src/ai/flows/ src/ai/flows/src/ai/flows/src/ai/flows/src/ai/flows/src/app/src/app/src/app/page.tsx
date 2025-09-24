// src/app/page.tsx
"use client";

import { useState } from "react";
import Link from 'next/link';
import { type Role } from "@/context/user-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  const { toast } = useToast();
  const { login, isLoading, error } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState<Role>("Admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginId, setLoginId] = useState("");

  const handleLogin = () => {
    login(selectedRole, loginId, password);
  };
  
  const getLoginIdLabel = () => {
    switch(selectedRole) {
      case 'Admin': return 'Email Address';
      case 'Staff': return 'Staff ID';
      case 'Student': return 'Registration Number';
      case 'Parent': return 'Registered Phone Number';
      default: return 'Login ID';
    }
  };

  const renderFormFields = () => {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="role">I am a...</Label>
          <Select value={selectedRole} onValueChange={(value) => {
              setSelectedRole(value as Role);
              setLoginId('');
              setPassword('');
            }} disabled={isLoading}>
            <SelectTrigger id="role">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Staff">Staff</SelectItem>
              <SelectItem value="Student">Student</SelectItem>
              <SelectItem value="Parent">Parent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="loginId">{getLoginIdLabel()}</Label>
          <Input id="loginId" type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder={`Enter your ${getLoginIdLabel()}`} disabled={isLoading} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() => toast({ title: 'Forgot Password', description: 'Please contact the school administrator to reset your password.' })}
              className="text-xs text-primary hover:underline"
              disabled={isLoading}
            >
              Forgot Password?
            </button>
          </div>
          <div className="relative">
            <Input 
              id="password" 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder={selectedRole === 'Student' ? 'Enter Reg. No. again' : selectedRole === 'Parent' ? 'Enter phone number again' : '********'}
              disabled={isLoading}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleLogin()}
            />
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPassword(prev => !prev)}
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        
        <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
        </Button>
      </>
    );
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex flex-col items-center text-center">
        <Icons.Logo className="h-14 w-14" />
        <h1 className="text-2xl font-bold font-headline mt-4">ENCON CONCEPT</h1>
        <p className="text-muted-foreground">The All-in-One School Management Platform</p>
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Welcome Back!</CardTitle>
          <CardDescription>Select your role to sign in to the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {renderFormFields()}
          </div>
        </CardContent>
      </Card>
      <div className="mt-4 text-center text-sm">
        Don't have a school account?{" "}
        <Link href="/register" className="underline text-primary">
          Register your school now
        </Link>
      </div>
    </main>
  );
}
