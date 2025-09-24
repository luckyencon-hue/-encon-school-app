// src/app/dashboard/announcements/page.tsx
"use client";

import { useState, useMemo } from "react";
import { announcements as initialAnnouncements, Announcement } from "@/lib/data";
import AnnouncementCard from "@/components/dashboard/announcement-card";
import AnnouncementForm from "@/components/dashboard/announcement-form";
import { useUser } from "@/context/user-context";

export default function AnnouncementsPage() {
  const { user } = useUser();
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);

  const handleAddAnnouncement = (newAnnouncement: Omit<Announcement, 'id' | 'author' | 'date'>) => {
    if (!user) return;
    const announcementToAdd: Announcement = {
      id: `announcement-${announcements.length + 1}`,
      author: user.name,
      date: new Date().toISOString().split("T")[0],
      ...newAnnouncement,
    };
    setAnnouncements([announcementToAdd, ...announcements]);
  };

  const canCreate = user?.role === "Admin" || user?.role === "Staff";

  const visibleAnnouncements = useMemo(() => {
    if (!user) return [];
    if (user.role === 'Admin' || user.role === 'Staff') {
      return announcements; // Admins and Staff see all announcements
    }
    // Students and Parents only see non-staff-only announcements
    return announcements.filter(ann => ann.category !== 'Staff Only');
  }, [user, announcements]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Announcements</h1>
          <p className="text-muted-foreground">
            Stay updated with the latest news from around the school.
          </p>
        </div>
        {canCreate && <AnnouncementForm onAddAnnouncement={handleAddAnnouncement} />}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleAnnouncements.map((announcement) => (
          <AnnouncementCard key={announcement.id} announcement={announcement} />
        ))}
      </div>
    </div>
  );
}
