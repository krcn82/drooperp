import {Card, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {Archive, FileDown, LayoutDashboard, Shield, ShoppingCart, Users, Settings} from 'lucide-react';
import Link from 'next/link';

const modules = [
  {
    title: 'Point of Sale',
    description: 'Manage sales for shop & restaurant.',
    icon: ShoppingCart,
    href: '/dashboard/pos',
    color: 'text-green-500',
  },
  {
    title: 'Invoices & Assets',
    description: 'Store and manage documents.',
    icon: Archive,
    href: '/dashboard/assets',
    color: 'text-blue-500',
  },
  {
    title: 'DATEV Export',
    description: 'Export financial data for accounting.',
    icon: FileDown,
    href: '/dashboard/datev-export',
    color: 'text-yellow-500',
  },
  {
    title: 'GDPR Tools',
    description: 'Data export, deletion, and compliance.',
    icon: Shield,
    href: '/dashboard/gdpr',
    color: 'text-red-500',
  },
  {
    title: 'User Management',
    description: 'Manage users and their permissions.',
    icon: Users,
    href: '#',
    color: 'text-purple-500',
  },
  {
    title: 'Settings',
    description: 'Configure tenant and system settings.',
    icon: Settings,
    href: '#',
    color: 'text-gray-500',
  },
];

export default function DashboardPage() {
  return (
    <>
      <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map(mod => (
          <Link href={mod.href} key={mod.title}>
            <Card className="hover:shadow-lg transition-shadow duration-300 hover:border-primary/50">
              <CardHeader className="flex flex-col items-center justify-center text-center p-6">
                <div className="mb-4">
                  <mod.icon className={`h-12 w-12 ${mod.color}`} />
                </div>
                <CardTitle className="font-headline text-xl">{mod.title}</CardTitle>
                <CardDescription>{mod.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
