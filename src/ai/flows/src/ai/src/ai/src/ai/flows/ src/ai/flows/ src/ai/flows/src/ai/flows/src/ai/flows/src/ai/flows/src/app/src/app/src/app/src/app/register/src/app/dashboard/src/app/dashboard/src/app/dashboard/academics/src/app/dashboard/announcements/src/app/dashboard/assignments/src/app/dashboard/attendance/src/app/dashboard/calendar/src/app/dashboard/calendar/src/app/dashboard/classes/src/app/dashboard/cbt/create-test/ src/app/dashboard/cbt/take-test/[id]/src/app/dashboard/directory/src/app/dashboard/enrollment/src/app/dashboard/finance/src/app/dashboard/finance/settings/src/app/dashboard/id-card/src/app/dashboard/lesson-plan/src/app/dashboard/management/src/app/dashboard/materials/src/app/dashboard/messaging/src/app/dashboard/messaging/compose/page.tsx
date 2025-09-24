// src/app/dashboard/messaging/compose/page.tsx
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useUser } from '@/context/user-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Conversation, User, Message } from '@/lib/data';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { useMemo } from 'react';

function ComposeMessageForm() {
    const { user, admins, staff, students, conversations, setConversations } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [recipient, setRecipient] = useState('');
    const [topic, setTopic] = useState('');
    const [message, setMessage] = useState('');
    const { toast } = useToast();
    
    useEffect(() => {
        const recipientParam = searchParams.get('recipient');
        const topicParam = searchParams.get('topic');
        if (recipientParam) {
            setRecipient(recipientParam);
        }
        if (topicParam) {
            setTopic(topicParam);
        }
    }, [searchParams]);

    const getUserId = (user: User) => {
        if (!user) return null;
        if (user.role === 'Student') return user.regNo;
        if (user.role === 'Parent') return user.phoneNo;
        return user.email;
    };

    const schoolParents = useMemo(() => {
        if (!user || !user.schoolId) return [];
        const parentMap = new Map<string, User>();
        students.filter(s => s.schoolId === user.schoolId).forEach(s => {
            if (s.parentContact && s.parentName && !parentMap.has(s.parentContact)) {
                parentMap.set(s.parentContact, {
                    name: s.parentName,
                    role: 'Parent',
                    avatar: s.avatar,
                    schoolId: s.schoolId,
                    schoolName: s.schoolName,
                    status: 'Active',
                    phoneNo: s.parentContact,
                    regNo: s.regNo,
                    classId: s.classId,
                    email: s.parentContact, // Use phone number as a unique ID
                });
            }
        });
        return Array.from(parentMap.values());
    }, [students, user]);
    
    if (!user) return null;
    const myId = getUserId(user);
    if (!myId) return null;
    
    const staffRecipients = staff.filter(s => getUserId(s) !== myId && s.schoolId === user.schoolId);
    const adminRecipients = admins.filter(a => getUserId(a) !== myId && a.schoolId === user.schoolId);
    const parentRecipients = schoolParents.filter(p => getUserId(p) !== myId);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipient || !topic.trim() || !message.trim()) {
            toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill out all fields to send a message.' });
            return;
        }

        // An existing conversation must have the same two participants and the same topic.
        const existingConversation = conversations.find(c =>
            c.participants.length === 2 &&
            c.participants.includes(myId) && 
            c.participants.includes(recipient) && 
            c.topic === topic
        );

        let conversationId;

        if (existingConversation) {
            conversationId = existingConversation.id;
            const newMessage: Message = {
                id: `msg-${Date.now()}`,
                senderId: myId,
                text: message,
                timestamp: new Date().toISOString(),
            };
            setConversations(prev => prev.map(c => 
                c.id === existingConversation.id 
                ? { ...c, messages: [...c.messages, newMessage], unread: true }
                : c
            ));
        } else {
            conversationId = `convo-${Date.now()}`;
            const newConversation: Conversation = {
                id: conversationId,
                participants: [myId, recipient],
                topic: topic,
                unread: true, // New conversations are always unread for the recipient
                messages: [
                    {
                        id: `msg-${Date.now()}`,
                        senderId: myId,
                        text: message,
                        timestamp: new Date().toISOString(),
                    }
                ]
            };
            setConversations(prev => [newConversation, ...prev]);
        }

        toast({ title: 'Message Sent', description: 'Your message has been sent successfully.'});
        router.push(`/dashboard/messaging?id=${conversationId}`);
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className='flex items-center gap-4'>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <CardTitle>Compose New Message</CardTitle>
                        <CardDescription>Send a new message to a member of the school community.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="recipient">Recipient</Label>
                        <Select onValueChange={setRecipient} value={recipient}>
                            <SelectTrigger id="recipient">
                                <SelectValue placeholder="Select a recipient" />
                            </SelectTrigger>
                            <SelectContent>
                                {adminRecipients.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>Administrators</SelectLabel>
                                        {adminRecipients.map(u => <SelectItem key={getUserId(u)} value={getUserId(u)!}>{u.name}</SelectItem>)}
                                    </SelectGroup>
                                )}
                                {staffRecipients.length > 0 && (
                                     <SelectGroup>
                                        <SelectLabel>Staff</SelectLabel>
                                        {staffRecipients.map(u => <SelectItem key={getUserId(u)} value={getUserId(u)!}>{u.name}</SelectItem>)}
                                    </SelectGroup>
                                )}
                                {parentRecipients.length > 0 && (
                                     <SelectGroup>
                                        <SelectLabel>Parents</SelectLabel>
                                        {parentRecipients.map(u => <SelectItem key={getUserId(u)} value={getUserId(u)!}>{u.name}</SelectItem>)}
                                    </SelectGroup>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="topic">Topic</Label>
                        <Input id="topic" placeholder="e.g., Question about homework" value={topic} onChange={(e) => setTopic(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea id="message" placeholder="Type your message here..." className="min-h-[200px]" value={message} onChange={(e) => setMessage(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full">
                        <Send className="mr-2 h-4 w-4"/>
                        Send Message
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function ComposeMessagePage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-10 w-10 animate-spin"/></div>}>
            <ComposeMessageForm />
        </Suspense>
    )
}
