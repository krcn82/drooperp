'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Shield, CreditCard, Users as UsersIcon, Building, Network, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import AccountSettings from './account-settings';
import SubscriptionSettings from './subscription-settings';
import UsersSettings from './users-settings';
import TenantSettings from './tenant-settings';
import IntegrationsSettings from './integrations';
import AutomationSettings from './automation-settings';
import Link from 'next/link';


type SettingsView = 'account' | 'subscription' | 'users' | 'tenants' | 'integrations' | 'automation';

const settingsNav = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'users', label: 'Users', icon: UsersIcon },
    { id: 'tenants', label: 'Tenants', icon: Building },
    { id: 'integrations', label: 'Integrations', icon: Network },
    { id: 'automation', label: 'Automation', icon: Settings2 },
] as const;


export default function SettingsPage() {
  const [activeView, setActiveView] = useState<SettingsView>('account');

  const renderContent = () => {
    switch (activeView) {
      case 'account':
        return <AccountSettings />;
      case 'subscription':
        return <SubscriptionSettings />;
      case 'users':
        return <UsersSettings />;
      case 'tenants':
        return <TenantSettings />;
      case 'integrations':
        return <IntegrationsSettings />;
      case 'automation':
        return <AutomationSettings />;
      default:
        return <AccountSettings />;
    }
  };

  return (
    <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold font-headline tracking-tight">Settings</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[250px_1fr] gap-8 items-start">
            {/* Sidebar */}
            <Card className="p-4 md:p-2 bg-muted/50 md:bg-transparent md:border-none md:shadow-none">
                <nav className="flex flex-row md:flex-col gap-2">
                    {settingsNav.map((item) => (
                         <Button
                            key={item.id}
                            variant="ghost"
                            onClick={() => setActiveView(item.id)}
                            className={cn(
                                'w-full justify-start text-base md:text-sm',
                                activeView === item.id && 'bg-accent text-accent-foreground'
                            )}
                         >
                            <item.icon className="mr-2 h-4 w-4" />
                            <span className="truncate">{item.label}</span>
                         </Button>
                    ))}
                    <Link href="/dashboard/gdpr">
                        <Button
                            variant="ghost"
                            className={cn('w-full justify-start text-base md:text-sm')}
                        >
                            <Shield className="mr-2 h-4 w-4" />
                            <span className="truncate">Data Privacy (DSGVO)</span>
                        </Button>
                    </Link>
                </nav>
            </Card>

            {/* Content */}
            <div className="md:col-start-2">
                {renderContent()}
            </div>
        </div>
    </div>
  );
}

    