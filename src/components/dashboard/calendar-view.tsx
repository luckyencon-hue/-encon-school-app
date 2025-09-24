"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "../ui/scroll-area";

export interface CalendarEvent {
  date: Date;
  title: string;
  description: string;
}

interface CalendarViewProps {
  events: CalendarEvent[];
}

export default function CalendarView({ events }: CalendarViewProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const selectedDayEvents = events.filter(
    (event) => date && event.date.toDateString() === date.toDateString()
  );

  const eventDays = events.map(e => e.date);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardContent className="p-2 sm:p-4">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md"
            modifiers={{
                events: eventDays
            }}
            modifiersClassNames={{
                events: "bg-primary/20 text-primary-foreground rounded-md"
            }}
          />
        </CardContent>
      </Card>
      <Card className="lg:col-span-1 h-fit">
        <CardHeader>
          <CardTitle className="font-headline text-lg">
            Events for {date ? date.toLocaleDateString() : "selected day"}
          </CardTitle>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[300px]">
                {selectedDayEvents.length > 0 ? (
                    <div className="space-y-4">
                    {selectedDayEvents.map((event, index) => (
                        <div key={index} className="p-3 bg-muted/50 rounded-lg">
                        <h4 className="font-semibold">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        </div>
                    ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No events for this day.</p>
                )}
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
