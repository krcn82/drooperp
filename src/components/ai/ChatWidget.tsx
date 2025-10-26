'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Bot, Send, Loader2, User as UserIcon, X } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { sendChatMessage } from '@/app/dashboard/actions';

type Message = {
  id?: string;
  role: 'user' | 'model';
  text: string;
  timestamp?: any;
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  
  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    const storedTenantId = localStorage.getItem('tenantId');
    if (storedTenantId) {
      setTenantId(storedTenantId);
      // For simplicity, we'll use one chat session per user. A more complex app might manage multiple chats.
      setChatId(user ? `chat_${user.uid}` : 'chat_global');
    }
  }, [user]);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !tenantId || !chatId) return null;
    return query(collection(firestore, `tenants/${tenantId}/aiChats/${chatId}/messages`), orderBy('timestamp', 'asc'));
  }, [firestore, tenantId, chatId]);

  const { data: messages, isLoading } = useCollection<Message>(messagesQuery);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        // A slight delay to allow the new message to render
        setTimeout(() => {
          const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
          if (viewport) {
             viewport.scrollTop = viewport.scrollHeight;
          }
        }, 100);
    }
  }, [messages]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !tenantId || !chatId) return;

    const userMessage: Message = {
      role: 'user',
      text: message,
      timestamp: serverTimestamp(),
    };
    
    setIsSending(true);
    setMessage('');
    
    const messagesRef = collection(firestore, `tenants/${tenantId}/aiChats/${chatId}/messages`);
    addDocumentNonBlocking(messagesRef, userMessage);

    const result = await sendChatMessage(tenantId, chatId, message, messages || []);
    
    if (result.success && result.response) {
      const aiMessage: Message = {
        role: 'model',
        text: result.response,
        timestamp: serverTimestamp(),
      };
      addDocumentNonBlocking(messagesRef, aiMessage);
    } else {
        const errorMessage: Message = {
            role: 'model',
            text: result.message || 'Sorry, I encountered an error.',
            timestamp: serverTimestamp(),
        };
        addDocumentNonBlocking(messagesRef, errorMessage);
    }

    setIsSending(false);
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : name[0];
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] h-[70vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Bot />
              AI Assistant
            </DialogTitle>
             <DialogDescription>Ask Droop anything about your business.</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {isLoading && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}
              {messages?.map((msg) => (
                <div key={msg.id} className={cn('flex items-end gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                   {msg.role === 'model' && (
                     <Avatar className="h-8 w-8">
                       <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                     </Avatar>
                   )}
                   <div className={cn(
                       'max-w-[75%] rounded-lg p-3 text-sm',
                       msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                   )}>
                     {/* Basic markdown renderer */}
                     <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                   </div>
                   {msg.role === 'user' && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.photoURL || ''} />
                        <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                      </Avatar>
                   )}
                </div>
              ))}
              {isSending && (
                 <div className="flex items-end gap-2 justify-start">
                    <Avatar className="h-8 w-8">
                       <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                     </Avatar>
                     <div className="max-w-[75%] rounded-lg p-3 text-sm bg-muted">
                        <Loader2 className="h-5 w-5 animate-spin" />
                     </div>
                 </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-background">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask Droop anything..."
                autoComplete="off"
                disabled={isSending}
              />
              <Button type="submit" size="icon" disabled={!message.trim() || isSending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-accent hover:bg-accent/90"
        onClick={() => setIsOpen(true)}
      >
        <Bot className="h-7 w-7" />
      </Button>
    </>
  );
}
