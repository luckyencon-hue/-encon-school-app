// src/app/dashboard/layout.tsx
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/user-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Loader2 } from 'lucide-react';
import { CommandMenu } from '@/components/layout/command-menu';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isGlobalLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isGlobalLoading && !user) {
      router.push('/');
    }
  }, [user, isGlobalLoading, router]);

  if (isGlobalLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading school data...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex min-h-screen flex-col">
            <Header />
            <CommandMenu />
            <main className="flex-1 p-4 sm:p-6 md:p-8">
                {children}
            </main>
            <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
