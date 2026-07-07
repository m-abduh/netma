'use client';

import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

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
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
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
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthGuard>
            {children}
          </AuthGuard>
        </QueryClientProvider>
      </body>
    </html>
  );
}
