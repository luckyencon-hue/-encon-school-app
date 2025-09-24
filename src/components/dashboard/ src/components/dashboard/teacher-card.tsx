import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";
import type { Staff } from "@/lib/data";


interface StaffCardProps {
  staff: Staff;
}

export default function StaffCard({ staff }: StaffCardProps) {
  const nameInitials = staff.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6 flex flex-col items-center text-center">
        <Avatar className="h-20 w-20 mb-4">
          <AvatarImage src={staff.avatar} alt={staff.name} data-ai-hint="person" />
          <AvatarFallback>{nameInitials}</AvatarFallback>
        </Avatar>
        <h3 className="font-headline font-semibold text-lg">{staff.name}</h3>
        <p className="text-muted-foreground">{staff.position}</p>
        <a
          href={`mailto:${staff.email}`}
          className="mt-2 text-sm text-primary/80 hover:text-primary flex items-center gap-1"
        >
          <Mail className="h-3 w-3" />
          {staff.email}
        </a>
      </CardContent>
    </Card>
  );
}
