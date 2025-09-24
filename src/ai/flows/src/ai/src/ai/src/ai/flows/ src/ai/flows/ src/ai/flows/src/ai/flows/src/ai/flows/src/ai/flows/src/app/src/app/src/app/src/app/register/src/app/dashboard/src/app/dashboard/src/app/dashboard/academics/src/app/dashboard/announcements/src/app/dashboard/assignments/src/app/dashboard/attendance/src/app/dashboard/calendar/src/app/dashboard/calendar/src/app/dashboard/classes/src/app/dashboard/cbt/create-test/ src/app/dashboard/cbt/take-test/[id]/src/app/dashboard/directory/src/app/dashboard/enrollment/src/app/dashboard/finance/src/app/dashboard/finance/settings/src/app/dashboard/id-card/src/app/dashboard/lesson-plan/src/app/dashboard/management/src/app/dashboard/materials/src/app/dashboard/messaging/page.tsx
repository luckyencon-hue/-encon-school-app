// src/app/dashboard/messaging/page.tsx
"use client";

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useUser } from '@/context/user-context';
import { Card, CardContent } from '@/components/ui/card';
import { ConversationList } from '@/components/dashboard/messaging/conversation-list';
import { MessageView } from '@/components/dashboard/messaging/message-view';
import type { Conversation } from '@/lib/data';
import { Mail, Loader2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

function MessagingContent() {
    const { user, conversations, setConversations } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

    const getMyId = () => {
      if (!user) return null;
      return user.role === 'Student' ? user.regNo : user.role === 'Parent' ? user.phoneNo : user.email;
    }

    const myConversations = useMemo(() => {
        const myId = getMyId();
        if (!myId) return [];
        
        return conversations
            .filter(c => c.participants.includes(myId))
            .sort((a,b) => new Date(b.messages[b.messages.length - 1].timestamp).getTime() - new Date(a.messages[a.messages.length - 1].timestamp).getTime());

    }, [user, conversations]);
    
    const handleSelectConversation = (conversation: Conversation) => {
        router.push(`/dashboard/messaging?id=${conversation.id}`, { scroll: false });
    }

    const selectedConversation = useMemo(() => {
        return myConversations.find(c => c.id === selectedConversationId);
    }, [myConversations, selectedConversationId]);

    useEffect(() => {
        const conversationIdFromUrl = searchParams.get('id');
        if (conversationIdFromUrl) {
             if(myConversations.some(c => c.id === conversationIdFromUrl)) {
                setSelectedConversationId(conversationIdFromUrl);
                // Mark as read when selected via URL
                setConversations(prev => prev.map(c => c.id === conversationIdFromUrl ? {...c, unread: false} : c));
             }
        } else {
            setSelectedConversationId(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);


    if (!user) return null;

    return (
        <div className="space-y-8 h-full flex flex-col">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
                    <Mail /> Messaging
                </h1>
                <p className="text-muted-foreground">
                    Communicate securely with staff, students, and parents.
                </p>
            </div>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
                <div className="md:col-span-1 lg:col-span-1 h-full">
                    <ConversationList 
                        conversations={myConversations}
                        onSelectConversation={handleSelectConversation}
                        selectedConversationId={selectedConversationId}
                    />
                </div>
                <div className="md:col-span-2 lg:col-span-3 h-full">
                    {selectedConversation ? (
                        <MessageView 
                            conversation={selectedConversation}
                            currentUser={user}
                        />
                    ) : (
                         <Card className="h-full flex items-center justify-center">
                            <CardContent className="text-center text-muted-foreground p-6">
                                <Mail className="mx-auto h-12 w-12 mb-4"/>
                                <p>Select a conversation to view messages</p>
                                <p className="text-sm">or start a new one.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function MessagingPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-10 w-10 animate-spin"/></div>}>
            <MessagingContent />
        </Suspense>
    )
}
