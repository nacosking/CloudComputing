import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Lock, CreditCard, Check } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";

const paymentSchema = z.object({
  cardName: z.string().min(2, "Name on card is required"),
  cardNumber: z.string().regex(/^\d{16}$/, "Card number must be 16 digits"),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/, "Use MM/YY format"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3-4 digits"),
});

export default function PaymentPage() {
  const [, navigate] = useLocation();
  const { addReservation, markReservationPaid } = useAuth(); // We need addReservation here now
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- CHANGE START: Get data from the Booking Form ---
  const bookingData = window.history.state?.bookingData;

  // If there's no data, they shouldn't be here
  if (!bookingData) {
    setTimeout(() => navigate("/"), 0);
    return null;
  }
  const reservation = bookingData;
  const depositAmount = 50; // Fixed deposit amount in USD

  async function onSubmit(values: z.infer<typeof paymentSchema>) {
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate QR code data with reservation details
    const qrData = JSON.stringify({
      reservationId: reservation.id,
      name: reservation.name,
      date: reservation.date,
      time: reservation.time,
      guests: reservation.guests,
      email: reservation.email,
      paid: true,
      paidAt: new Date().toISOString(),
    });

    markReservationPaid(reservation.id, qrData);
    setIsProcessing(false);
    setIsSuccess(true);

    setTimeout(() => {
      navigate("/reservations");
    }, 2500);
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 md:p-12 rounded-2xl border border-primary/20 text-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex justify-center mb-6"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-primary" />
              </div>
            </motion.div>
            <h2 className="font-serif text-3xl font-bold mb-3 text-foreground">Payment Successful!</h2>
            <p className="text-foreground/70 mb-2">Deposit of ${depositAmount}.00 received</p>
            <p className="text-sm text-foreground/60 mb-6">
              Your reservation is confirmed and your deposit has been secured.
            </p>
            <p className="text-xs text-foreground/50 italic">
              Redirecting to your reservations...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-serif text-4xl font-bold mb-2 text-foreground">Secure Deposit</h1>
          <p className="text-foreground/70">Complete your reservation with a ${depositAmount} deposit</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-6 border border-primary/20"
          >
            <h2 className="font-serif text-2xl font-bold mb-6 text-foreground">Reservation Summary</h2>

            <div className="space-y-4 mb-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
              <div className="flex justify-between">
                <span className="text-foreground/70">Restaurant</span>
                <span className="font-semibold text-foreground">Lumière Bistro</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Date</span>
                <span className="font-semibold text-foreground">
                  {format(parseISO(reservation.date), "MMM dd, yyyy")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Time</span>
                <span className="font-semibold text-foreground">{reservation.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Party Size</span>
                <span className="font-semibold text-foreground">{reservation.guests} {reservation.guests === 1 ? "Guest" : "Guests"}</span>
              </div>
              <div className="border-t border-primary/10 pt-4 flex justify-between">
                <span className="text-foreground/70">Name</span>
                <span className="font-semibold text-foreground">{reservation.name}</span>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-3 border-t border-primary/20 pt-6">
              <div className="flex justify-between text-lg">
                <span className="text-foreground">Deposit</span>
                <span className="font-bold text-primary text-xl">${depositAmount}.00</span>
              </div>
              <p className="text-xs text-foreground/60 italic">
                💡 This deposit will be applied to your final bill. The remaining balance will be due on the day of your reservation.
              </p>
            </div>
          </motion.div>

          {/* Right: Payment Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-card to-card/90 rounded-2xl p-6 border border-primary/20 shadow-xl"
          >
            <h2 className="font-serif text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Payment Details
            </h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="cardName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name on Card</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          {...field}
                          disabled={isProcessing}
                          className="bg-background/80 border-primary/20 focus:border-primary/50 rounded-lg h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        Card Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="4111111111111111"
                          {...field}
                          disabled={isProcessing}
                          maxLength={16}
                          className="bg-background/80 border-primary/20 focus:border-primary/50 rounded-lg h-11 font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="expiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="MM/YY"
                            {...field}
                            disabled={isProcessing}
                            maxLength={5}
                            className="bg-background/80 border-primary/20 focus:border-primary/50 rounded-lg h-11 font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cvv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CVV</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123"
                            type="password"
                            {...field}
                            disabled={isProcessing}
                            maxLength={4}
                            className="bg-background/80 border-primary/20 focus:border-primary/50 rounded-lg h-11 font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/70">
                    Your payment information is encrypted and secure. We never store your full card details.
                  </p>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full h-12 text-lg font-serif bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-lg shadow-lg"
                  >
                    {isProcessing ? (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        Processing...
                      </motion.span>
                    ) : (
                      `Pay $${depositAmount}.00 Deposit`
                    )}
                  </Button>
                </motion.div>
              </form>
            </Form>

            <p className="text-center text-xs text-foreground/60 mt-6">
              💳 Use card number <span className="font-mono">4111111111111111</span> for demo
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
