"use client";

import { useState } from "react";
import AddEventForm from "@/components/dashboard/add-event-form";
import CalendarView, { type CalendarEvent } from "@/components/dashboard/calendar-view";
import { useUser } from "@/context/user-context";

const initialEvents: CalendarEvent[] = [
  {
    date: new Date(),
    title: 'Mid-term presentations',
    description: 'Computer Science mid-term project presentations in Hall C.',
  },
  {
    date: new Date(new Date().setDate(new Date().getDate() + 5)),
    title: 'Guest Lecture: AI Ethics',
    description: 'Special guest lecture by Dr. Anya Sharma on the ethics of artificial intelligence. Main Auditorium, 2 PM.',
  }
];

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const { user } = useUser();

  const handleAddEvent = (newEvent: CalendarEvent) => {
    setEvents((prev) => [...prev, newEvent].sort((a,b) => a.date.getTime() - b.date.getTime()));
  };
  
  const canAddEvent = user?.role === 'Admin' || user?.role === 'Staff';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">
            Important dates, deadlines, and events.
          </p>
        </div>
        {canAddEvent && <AddEventForm onAddEvent={handleAddEvent} />}
      </div>

      <CalendarView events={events} />
    </div>
  );
}
