'use client';

import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (typeof window !== 'undefined') {
    const authed = isAuthenticated();

    if (pathname === '/' && authed) {
      router.replace('/dashboard');
      return null;
    }

    if (pathname !== '/' && !authed) {
      router.replace('/');
      return null;
    }
  }

  if (pathname === '/') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 min-h-0 overflow-auto lg:pt-0">
        {children}
      </main>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false } },
  }));

  return (
    <html lang="id" className={cn('font-sans', inter.variable)}>
      <body>
        <TooltipProvider>
          <QueryClientProvider client={queryClient}>
            <AuthGuard>
              {children}
            </AuthGuard>
          </QueryClientProvider>
          <Toaster position="bottom-right" theme="dark" />
        </TooltipProvider>
      </body>
    </html>
  );
}