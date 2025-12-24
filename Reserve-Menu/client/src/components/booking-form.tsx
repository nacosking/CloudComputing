import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, User, Mail, Clock, Users } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  date: z.date({ required_error: "A date is required" }),
  time: z.string({ required_error: "Time is required" }),
  guests: z.string({ required_error: "Party size is required" }),
});

export function BookingForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      navigate("/login");
      return;
    }

    const dateStr = format(values.date, "yyyy-MM-dd");

    // 1. Show the success animation
    setIsSubmitted(true);

    // 2. Navigate to payment after 2 seconds
    setTimeout(() => {
      navigate("/payment", {
        state: {
          bookingData: {
            ...values,
            date: dateStr,
            guests: parseInt(values.guests)
          }
        }
      });
    }, 2000);
  }

  // --- RESTORED SUCCESS MESSAGE BLOCK ---
  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 md:p-12 rounded-2xl shadow-2xl text-center border border-primary/20 backdrop-blur-sm"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="flex justify-center mb-6"
        >
          <CheckCircle2 className="w-16 h-16 text-primary" />
        </motion.div>
        <h3 className="font-serif text-3xl font-bold mb-4 text-foreground">Details Confirmed</h3>
        <p className="text-foreground/70 mb-2">
          Thank you for choosing Lumière
        </p>
        <p className="text-sm text-foreground/60 italic">
          Redirecting to secure payment...
        </p>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl opacity-60" />
      <div className="relative bg-gradient-to-br from-card to-card/90 p-8 md:p-10 rounded-2xl shadow-2xl border border-primary/20">
        <div className="mb-8">
          <h3 className="font-serif text-3xl font-bold mb-2 text-foreground">Reserve Your Table</h3>
          <p className="text-foreground/70 text-sm">Complete your booking in just a few steps</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-semibold flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Full Name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} className="bg-background/80 border-primary/20 rounded-lg h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-semibold flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" {...field} className="bg-background/80 border-primary/20 rounded-lg h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col relative group">
                    <FormLabel className="text-foreground font-semibold flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-primary" />
                      Date
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-4 pr-3 text-left font-normal rounded-lg h-12 bg-background/80 border-primary/20", !field.value && "text-foreground/40")}>
                            {field.value ? format(field.value, "MMM dd, yyyy") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Time
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/80 border-primary/20 rounded-lg h-11">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="18:00">6:00 PM</SelectItem>
                        <SelectItem value="19:00">7:00 PM</SelectItem>
                        <SelectItem value="20:00">8:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Guests
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/80 border-primary/20 rounded-lg h-11">
                          <SelectValue placeholder="Size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="2">2 Guests</SelectItem>
                        <SelectItem value="4">4 Guests</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full h-12 text-lg font-serif bg-primary text-primary-foreground rounded-lg">
              {user ? "Confirm Reservation" : "Sign In to Book"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}