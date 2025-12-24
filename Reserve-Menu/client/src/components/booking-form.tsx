import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock, Users, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  date: z.date({ required_error: "Date is required" }),
  time: z.string({ required_error: "Time is required" }),
  guests: z.string({ required_error: "Guests required" }),
});

export function BookingForm() {
  const [, navigate] = useLocation();
  const { user, addReservation } = useAuth();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      time: "18:00", // Fixes "controlled vs uncontrolled" warning
      guests: "2",   // Fixes "controlled vs uncontrolled" warning
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return navigate("/login");
    try {
      await addReservation({
        name: values.name,
        email: values.email,
        date: format(values.date, "yyyy-MM-dd"),
        time: values.time,
        guests: values.guests === "more" ? 9 : parseInt(values.guests),
      });
      setIsSubmitted(true);
      setTimeout(() => navigate("/payment"), 2000);
    } catch (e: any) {
      setErrorMsg(e?.message || "Reservation failed");
    }
  }

  if (isSubmitted) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-10 bg-card rounded-xl border border-primary/20">
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
        <h3 className="text-2xl font-bold mb-2 text-foreground">Reservation Confirmed</h3>
        <p className="text-foreground/70">Redirecting to payment...</p>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl opacity-60" />
      <div className="relative bg-card p-8 md:p-10 rounded-2xl shadow-2xl border border-primary/20">
        <div className="mb-8">
          <h3 className="font-serif text-3xl font-bold mb-2 text-foreground">Reserve Your Table</h3>
          <p className="text-foreground/70 text-sm">Complete your booking in just a few steps</p>
        </div>

        {errorMsg && <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 border border-red-300">{errorMsg}</div>}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input {...field} placeholder="Name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input {...field} type="email" placeholder="Email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
              )} />
              <FormField control={form.control} name="time" render={({ field }) => (
                <FormItem>
                  <FormLabel>Time</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Time" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["17:00", "18:00", "19:00", "20:00", "21:00"].map(t => (
                        <SelectItem key={t} value={t}>{t} PM</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="guests" render={({ field }) => (
                <FormItem>
                  <FormLabel>Guests</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Size" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} Guests</SelectItem>
                      ))}
                      <SelectItem value="more">8+ Guests</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Button type="submit" className="w-full h-12 text-lg font-serif bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              {user ? "Confirm Reservation" : "Sign In to Book"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}