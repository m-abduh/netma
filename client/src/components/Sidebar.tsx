'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { clearAuth } from '@/lib/auth';
import type { Employee } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Clock,
  Megaphone,
  Folder,
  ScrollText,
  Settings,
  LogOut,
  Users,
} from 'lucide-react';

const menuItems: { path: string; label: string; icon: typeof LayoutDashboard }[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/chat', label: 'Chat', icon: MessageSquare },
  { path: '/notes', label: 'Notes', icon: FileText },
  { path: '/jobs', label: 'Jobs', icon: Clock },
  { path: '/broadcast', label: 'Broadcast', icon: Megaphone },
  { path: '/files', label: 'Files', icon: Folder },
  { path: '/logs', label: 'Logs', icon: ScrollText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/chat': 'Chat',
  '/notes': 'Notes',
  '/jobs': 'Daily Jobs',
  '/broadcast': 'Broadcast',
  '/files': 'Files',
  '/logs': 'Logs',
  '/settings': 'Settings',
};

function NavItem({ item, active, onClick }: { item: typeof menuItems[0]; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200',
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
      )}
      <Icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
      <span>{item.label}</span>
    </button>
  );
}

function NavContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="flex-1 space-y-1 px-2 py-3 overflow-auto">
      {menuItems.map((item) => (
        <NavItem
          key={item.path}
          item={item}
          active={pathname === item.path}
          onClick={() => {
            router.push(item.path);
            onNavClick?.();
          }}
        />
      ))}
    </nav>
  );
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const online = employees?.filter((e: Employee) => e.status === 'online').length || 0;

  return (
    <aside className="flex flex-col h-full bg-card border-r border-border">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          N
        </div>
        <div>
          <h1 className="text-base font-semibold leading-tight">Netma</h1>
          <p className="text-[11px] text-muted-foreground leading-tight">Manajemen Perusahaan</p>
        </div>
      </div>

      <NavContent onNavClick={onNavClick} />

      <div className="border-t border-border p-3 space-y-2 shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>
            {employees?.length || 0} karyawan
            <span className="ml-1 text-green-400">({online} online)</span>
          </span>
        </div>
        <button
          onClick={() => { clearAuth(); router.push('/'); }}
          className="flex w-full items-center gap-2 px-2 py-2 text-xs text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Keluar
        </button>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile header bar */}
      <header className="flex lg:hidden items-center justify-between h-14 px-4 border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
            N
          </div>
          <span className="text-sm font-semibold">{pageTitles[pathname] || 'Netma'}</span>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="-mr-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              </Button>
            }
          />
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigasi</SheetTitle>
            </SheetHeader>
            <SidebarContent onNavClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:h-screen lg:shrink-0">
        <SidebarContent />
      </div>
    </>
  );
}