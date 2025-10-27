'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, Bell, CheckCheck, Info, AlertTriangle, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type Notification = {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'alert' | 'success' | 'insight';
    timestamp: Timestamp;
    read: boolean;
};

const notificationIcons = {
    info: <Info className="h-5 w-5 text-blue-500" />,
    alert: <AlertTriangle className="h-5 w-5 text-orange-500" />,
    success: <BadgeCheck className="h-5 w-5 text-green-500" />,
    insight: <Bell className="h-5 w-5 text-primary" />,
};

type NotificationCenterProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function NotificationCenter({ open, onOpenChange }: NotificationCenterProps) {
    const firestore = useFirestore();
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;

    const notificationsQuery = useMemoFirebase(() => {
        if (!firestore || !tenantId) return null;
        return collection(firestore, `tenants/${tenantId}/notifications`);
    }, [firestore, tenantId]);

    const { data: notifications, isLoading, error } = useCollection<Notification>(notificationsQuery);
    
    const sortedNotifications = useMemo(() => {
        if (!notifications) return [];
        return notifications.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
    }, [notifications]);

    const handleMarkAllRead = async () => {
        if (!firestore || !tenantId || !notifications) return;
        
        const batch = writeBatch(firestore);
        const unreadDocs = notifications.filter(n => !n.read);

        if (unreadDocs.length === 0) return;

        unreadDocs.forEach(notification => {
            const docRef = doc(firestore, `tenants/${tenantId}/notifications`, notification.id);
            batch.update(docRef, { read: true });
        });

        try {
            await batch.commit();
        } catch (e) {
            console.error("Failed to mark all notifications as read", e);
        }
    };
    
    const handleMarkAsRead = (notificationId: string) => {
        if (!firestore || !tenantId) return;
        const docRef = doc(firestore, `tenants/${tenantId}/notifications`, notificationId);
        updateDocumentNonBlocking(docRef, { read: true });
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col p-0">
                <SheetHeader className="p-6 border-b">
                    <SheetTitle className="flex items-center gap-2">
                        <Bell /> Notifications
                    </SheetTitle>
                    <SheetDescription>
                        Recent updates and alerts from your system.
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1">
                    <div className="p-2">
                        {isLoading && (
                            <div className="flex items-center justify-center p-10 text-muted-foreground">
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
                            </div>
                        )}
                        {error && <p className="text-destructive p-4">Error: {error.message}</p>}
                        {!isLoading && sortedNotifications.length === 0 && (
                            <div className="text-center text-muted-foreground p-10">
                                <CheckCheck className="mx-auto h-12 w-12" />
                                <p className="mt-2">You're all caught up!</p>
                            </div>
                        )}
                        <div className="space-y-2">
                        {sortedNotifications.map(notification => (
                            <div 
                                key={notification.id} 
                                className={cn(
                                    "p-4 rounded-lg flex gap-4 items-start cursor-pointer hover:bg-muted/50",
                                    !notification.read && "bg-primary/5 dark:bg-primary/10"
                                )}
                                onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                            >
                                <div className="mt-1">{notificationIcons[notification.type] || notificationIcons.info}</div>
                                <div className="flex-1">
                                    <p className={cn("font-semibold", !notification.read && "font-bold")}>{notification.title}</p>
                                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(notification.timestamp.toDate(), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                </ScrollArea>
                <SheetFooter className="p-4 border-t">
                    <Button onClick={handleMarkAllRead} className="w-full" disabled={!notifications?.some(n => !n.read)}>
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Mark All as Read
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
