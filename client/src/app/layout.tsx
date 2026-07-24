'use client';

import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

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
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-512x512.png" />
      </head>
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