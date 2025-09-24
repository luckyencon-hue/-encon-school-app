// src/components/dashboard/announcement-card.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MarkdownRenderer from "@/components/markdown-renderer";
import type { Announcement } from "@/lib/data";
import { Megaphone, AlertTriangle, CalendarCheck, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnnouncementCardProps {
  announcement: Announcement;
}

const categoryStyles = {
  General: {
    icon: Megaphone,
    bgColor: "bg-blue-500",
    textColor: "text-blue-50",
  },
  Urgent: {
    icon: AlertTriangle,
    bgColor: "bg-red-500",
    textColor: "text-red-50",
  },
  Event: {
    icon: CalendarCheck,
    bgColor: "bg-green-500",
    textColor: "text-green-50",
  },
  'Staff Only': {
    icon: Shield,
    bgColor: "bg-purple-600",
    textColor: "text-purple-50",
  }
};

export default function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const category = announcement.category || 'General';
  const styles = categoryStyles[category];
  const Icon = styles.icon;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 flex flex-col">
      <div className={cn("p-4 rounded-t-lg flex items-center gap-4", styles.bgColor, styles.textColor)}>
          <Icon className="h-8 w-8" />
          <h2 className="text-lg font-bold font-headline">{announcement.title}</h2>
      </div>
      <CardHeader className="pt-4">
        <CardDescription>
          By {announcement.author} on {new Date(announcement.date).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <MarkdownRenderer content={announcement.content} />
      </CardContent>
    </Card>
  );
}
