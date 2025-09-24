"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { CalendarIcon, Loader2, PlusCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { refineCalendarData } from "@/ai/flows/calendar-data-refinement";
import type { CalendarEvent } from "./calendar-view";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "../ui/calendar";

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100),
  date: z.date({ required_error: "A date is required." }),
  rawContent: z.string().min(10, "Description must be at least 10 characters."),
});

type AddEventFormProps = {
  onAddEvent: (event: CalendarEvent) => void;
};

export default function AddEventForm({ onAddEvent }: AddEventFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      rawContent: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsProcessing(true);
    try {
      const result = await refineCalendarData({ calendarData: values.rawContent });
      const newEvent: CalendarEvent = {
        date: values.date,
        title: values.title,
        description: result.refinedCalendarData,
      };
      onAddEvent(newEvent);
      form.reset();
      setIsOpen(false);
      toast({
        title: "Event Added",
        description: "The new event has been added to your calendar.",
      });
    } catch (error) {
      console.error("AI refinement failed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not refine or add the event. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Add AI-Powered Event
          </DialogTitle>
          <DialogDescription>
            Describe your event, and our AI will format it for the calendar.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Final Exam Study Session" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rawContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., meeting tomorrow at 3pm in the library to study for the physics final, bring notes"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                   <FormDescription>
                    Provide the raw details. The AI will clean it up.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isProcessing}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Refine & Add
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
