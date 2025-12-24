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
  const { user, addReservation } = useAuth();

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
    
    addReservation({
      name: values.name,
      email: values.email,
      date: dateStr,
      time: values.time,
      guests: parseInt(values.guests),
    });

    setIsSubmitted(true);
    setTimeout(() => {
      navigate("/payment");
    }, 2000);
  }

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
        <h3 className="font-serif text-3xl font-bold mb-4 text-foreground">Reservation Confirmed</h3>
        <p className="text-foreground/70 mb-2">
          Thank you for booking with Lumière
        </p>
        <p className="text-sm text-foreground/60">
          Proceeding to secure your deposit...
        </p>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      {/* Background Glow */}
      <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl opacity-60" />
      
      <div className="relative bg-gradient-to-br from-card to-card/90 p-8 md:p-10 rounded-2xl shadow-2xl border border-primary/20">
        {/* Header */}
        <div className="mb-8">
          <h3 className="font-serif text-3xl font-bold mb-2 text-foreground">Reserve Your Table</h3>
          <p className="text-foreground/70 text-sm">Complete your booking in just a few steps</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name & Email Row */}
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
                      <Input 
                        placeholder="John Doe" 
                        {...field} 
                        className="bg-background/80 border-primary/20 focus:border-primary/50 focus:ring-primary/20 rounded-lg h-11 placeholder:text-foreground/40"
                      />
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
                      <Input 
                        placeholder="john@example.com" 
                        {...field} 
                        className="bg-background/80 border-primary/20 focus:border-primary/50 focus:ring-primary/20 rounded-lg h-11 placeholder:text-foreground/40"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date, Time & Guests Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col relative group">
                    <FormLabel className="text-foreground font-semibold flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <CalendarIcon className="w-4 h-4 text-primary" />
                      </motion.div>
                      Date
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-4 pr-3 text-left font-normal rounded-lg h-12 transition-all",
                                "bg-gradient-to-r from-background/80 to-primary/5",
                                "border-2 border-primary/30 hover:border-primary/60",
                                "hover:shadow-lg hover:shadow-primary/20",
                                !field.value ? "text-foreground/40" : "text-foreground font-medium"
                              )}
                            >
                              <div className="flex flex-col flex-1">
                                {field.value ? (
                                  <>
                                    <span className="text-xs text-foreground/60 uppercase tracking-wider">Selected</span>
                                    <span className="text-sm font-serif">{format(field.value, "MMM dd, yyyy")}</span>
                                  </>
                                ) : (
                                  <span className="text-sm">Pick your date</span>
                                )}
                              </div>
                              <motion.div
                                animate={{ x: field.value ? 0 : [0, 4, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                <CalendarIcon className="w-5 h-5 text-primary opacity-70" />
                              </motion.div>
                            </Button>
                          </motion.div>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4" align="start">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            className="rounded-xl border border-primary/20"
                          />
                        </motion.div>
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
                        <SelectTrigger className="bg-background/80 border-primary/20 focus:border-primary/50 rounded-lg h-11">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="17:00">5:00 PM</SelectItem>
                        <SelectItem value="17:30">5:30 PM</SelectItem>
                        <SelectItem value="18:00">6:00 PM</SelectItem>
                        <SelectItem value="18:30">6:30 PM</SelectItem>
                        <SelectItem value="19:00">7:00 PM</SelectItem>
                        <SelectItem value="19:30">7:30 PM</SelectItem>
                        <SelectItem value="20:00">8:00 PM</SelectItem>
                        <SelectItem value="20:30">8:30 PM</SelectItem>
                        <SelectItem value="21:00">9:00 PM</SelectItem>
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
                        <SelectTrigger className="bg-background/80 border-primary/20 focus:border-primary/50 rounded-lg h-11">
                          <SelectValue placeholder="Party size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? "Guest" : "Guests"}
                          </SelectItem>
                        ))}
                        <SelectItem value="more">8+ (Call us)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-serif bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                {user ? "Confirm Reservation" : "Sign In to Book"}
              </Button>
            </motion.div>

            {!user && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-foreground/60 text-sm text-center italic"
              >
                You'll need to sign in to complete your reservation
              </motion.p>
            )}

            {/* Info Message */}
            <div className="pt-4 border-t border-primary/10">
              <p className="text-xs text-foreground/60 text-center">
                💡 <span className="italic">For parties larger than 8, please call us directly at (555) 123-4567</span>
              </p>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
