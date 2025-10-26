'use client';
import Link from 'next/link';
import {
  LineChart,
  LayoutDashboard,
  PanelLeft,
  Search,
  Settings,
  ShoppingCart,
  LogOut,
  FileText,
} from 'lucide-react';
import {usePathname, useRouter} from 'next/navigation';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Sheet, SheetContent, SheetTrigger} from '@/components/ui/sheet';
import {cn} from '@/lib/utils';
import {UserNav} from '@/components/common/user-nav';
import {Database} from 'lucide-react';
import {useAuth, useUser} from '@/firebase';
import {useEffect} from 'react';
import {onAuthStateChanged, signOut} from 'firebase/auth';

const navItems = [
  {href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'},
  {href: '/dashboard/pos', icon: ShoppingCart, label: 'Point of Sale'},
  {href: '/dashboard/reports', icon: LineChart, label: 'Reports'},
  {href: '/dashboard/settings', icon: Settings, label: 'Settings'},
];

export default function DashboardLayout({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const auth = useAuth();
  const {user, isUserLoading} = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      // The useEffect above will handle the redirect to /login
    }
  };

  const NavLink = ({href, icon: Icon, label, mobile = false}: (typeof navItems)[0] & {mobile?: boolean}) => (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
        pathname.startsWith(href) && (href !== '/dashboard' || pathname === '/dashboard') ? 'bg-muted text-primary' : '',
        mobile && 'gap-4 px-2.5 text-base'
      )}>
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );

  if (isUserLoading || !user) {
    return (
       <div className="flex h-screen w-full items-center justify-center">
        <Database className="h-8 w-8 animate-spin text-primary" />
       </div>
    )
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold font-headline">
              <Database className="h-6 w-6 text-primary" />
              <span>Droop ERP</span>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4 mt-4">
              {navItems.map(item => (
                <NavLink key={item.href} {...item} />
              ))}
            </nav>
          </div>
          <div className="mt-auto p-4">
            <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <div className="flex h-14 items-center border-b px-6">
                 <Link href="/" className="flex items-center gap-2 font-semibold font-headline">
                    <Database className="h-6 w-6 text-primary" />
                    <span>Droop ERP</span>
                  </Link>
              </div>
              <nav className="grid gap-2 p-4 text-lg font-medium">
                {navItems.map(item => (
                  <NavLink key={item.href} {...item} mobile />
                ))}
              </nav>
              <div className="mt-auto p-4 border-t">
                 <Button variant="ghost" className="w-full justify-start text-base" onClick={handleLogout}>
                   <LogOut className="mr-2 h-5 w-5" />
                    Sign Out
                  </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <form>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
                />
              </div>
            </form>
          </div>
          <UserNav />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">{children}</main>
      </div>
    </div>
  );
}
