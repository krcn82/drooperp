'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Bot, Send, Loader2, User as UserIcon } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { sendChatMessage, ChatOutput } from '@/app/dashboard/actions';
import { useAiState } from '@/hooks/use-ai-state';
import AiSuggestionModal from './AiSuggestionModal';

type Message = {
  id?: string;
  role: 'user' | 'model';
  text: string;
  timestamp?: any;
};

export default function ChatWidget() {
  const { isChatOpen, setChatOpen, prefilledMessage, clearPrefilledMessage } = useAiState();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const { setSuggestion, clearSuggestion } = useAiState();
  
  const { user } = useUser();
  const firestore = useFirestore();
  
  useEffect(() => {
    if (prefilledMessage) {
        setMessage(prefilledMessage);
        clearPrefilledMessage();
    }
  }, [prefilledMessage, clearPrefilledMessage]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
            e.preventDefault();
            setChatOpen(!isChatOpen);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatOpen, setChatOpen]);


  useEffect(() => {
    const storedTenantId = localStorage.getItem('tenantId');
    if (storedTenantId) {
      setTenantId(storedTenantId);
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
    if (!message.trim() || !user || !tenantId || !chatId || !firestore) return;

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
    
    if (result.success && result.output) {
        const { response, suggestion } = result.output;
        
        const aiMessage: Message = {
            role: 'model',
            text: response,
            timestamp: serverTimestamp(),
        };
        addDocumentNonBlocking(messagesRef, aiMessage);

        if (suggestion) {
            setSuggestion(suggestion);
        }

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
      <Dialog open={isChatOpen} onOpenChange={setChatOpen}>
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
      
      <AiSuggestionModal />
    </>
  );
}
