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
  Menu,
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

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const online = employees?.filter((e: Employee) => e.status === 'online').length || 0;
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <aside className="flex flex-col h-full bg-card border-r border-border">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          N
        </div>
        <div>
          <h1 className="text-base font-semibold leading-tight">Netma</h1>
          <p className="text-[11px] text-muted-foreground leading-tight">Manajemen Karyawan</p>
        </div>
      </div>

      <NavContent onNavClick={() => setMobileOpen(false)} />

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-2">
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

  return (
    <>
      {/* Mobile trigger */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-3 left-3 z-50 lg:hidden bg-background/80 backdrop-blur-sm border border-border shadow-sm"
            >
              <Menu className="h-5 w-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigasi</SheetTitle>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:h-screen lg:shrink-0">
        {sidebarContent}
      </div>
    </>
  );
}