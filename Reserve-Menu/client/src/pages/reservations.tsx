import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReservationSchema } from "@shared/schema";
import { useCreateReservation } from "@/hooks/use-reservations";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Extend schema to ensure types match form inputs properly
const formSchema = insertReservationSchema.extend({
  guests: z.coerce.number().min(1, "At least 1 guest required"),
  date: z.coerce.date({ required_error: "Date is required" }),
  phone: z.string().min(10, "Please enter a valid phone number"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Reservations() {
  const { toast } = useToast();
  const mutation = useCreateReservation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guests: 2,
      time: "19:00",
    },
  });

  function onSubmit(data: FormValues) {
    mutation.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Reservation Confirmed!",
          description: `We'll see you on ${format(data.date, "PPP")} at ${data.time}.`,
          duration: 5000,
        });
        form.reset();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  }

  const timeSlots = [
    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
    "20:00", "20:30", "21:00", "21:30"
  ];

  return (
    <div className="min-h-screen bg-secondary/10 pb-24">
      <div className="relative h-[40vh] bg-foreground flex items-center justify-center overflow-hidden">
        {/* Unsplash: Elegant table setting, wine glasses */}
        <img
          src="https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1974&auto=format&fit=crop"
          alt="Table Setting"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="font-serif text-4xl md:text-6xl font-bold mb-4">Book a Table</h1>
          <p className="text-white/80 text-lg max-w-lg mx-auto">
            Reserve your spot for an unforgettable dining experience.
          </p>
        </div>
      </div>

      <div className="container-custom -mt-20 relative z-20">
        <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden max-w-4xl mx-auto flex flex-col md:flex-row">
          {/* Left Side Info */}
          <div className="bg-foreground text-primary-foreground p-8 md:p-12 md:w-1/3 flex flex-col justify-between">
            <div className="space-y-6">
              <h3 className="font-serif text-2xl font-bold text-white">Information</h3>
              <div className="space-y-4 text-white/70">
                <p>
                  Reservations are required for groups of 6 or more.
                </p>
                <p>
                  For private events, please contact us directly by phone.
                </p>
              </div>
            </div>

            <div className="mt-12 space-y-2 text-white/90">
              <p className="font-bold">Reservation Support</p>
              <p className="text-2xl font-serif text-primary">(415) 555-0123</p>
            </div>
          </div>

          {/* Right Side Form */}
          <div className="p-8 md:p-12 md:w-2/3 bg-background">
            {mutation.isSuccess ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="font-serif text-3xl font-bold">Confirmed!</h2>
                <p className="text-muted-foreground max-w-xs">
                  Your table has been reserved. Check your email for confirmation details.
                </p>
                <Button
                  onClick={() => mutation.reset()}
                  variant="outline"
                  className="mt-4"
                >
                  Make Another Reservation
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} className="h-12 bg-secondary/20" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 000-0000" {...field} className="h-12 bg-secondary/20" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} className="h-12 bg-secondary/20" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                    "h-12 pl-3 text-left font-normal bg-secondary/20 border-input",
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
                                disabled={(date) =>
                                  date < new Date() || date < new Date("1900-01-01")
                                }
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
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 bg-secondary/20">
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timeSlots.map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
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
                          <FormLabel>Guests</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} max={20} {...field} className="h-12 bg-secondary/20" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full h-12 text-lg font-medium bg-primary hover:bg-primary/90 rounded-xl mt-6 shadow-lg shadow-primary/20"
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      "Confirm Reservation"
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
