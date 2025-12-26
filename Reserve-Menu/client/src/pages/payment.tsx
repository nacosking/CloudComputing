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
import { useState, useRef } from "react";
import { format, parseISO } from "date-fns";
import { QRCodeCanvas } from "qrcode.react"; // ✅ Restored

const paymentSchema = z.object({
  cardName: z.string().min(2, "Name on card is required"),
  cardNumber: z.string().regex(/^\d{16}$/, "Card number must be 16 digits"),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/, "Use MM/YY format"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3-4 digits"),
});

export default function PaymentPage() {
  const [, navigate] = useLocation();
  const { lastReservation, markReservationPaid } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // ✅ Restored: Ref for capturing the QR code
  const qrRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
  });

  const depositAmount = 50;

  async function onSubmit(values: z.infer<typeof paymentSchema>) {
    setIsProcessing(true);

    // Safety check: if user refreshed and lost reservation data, stop.
    if (!lastReservation) {
      setIsProcessing(false);
      return;
    }

    try {
      // 1. Simulate Payment Processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const reservation = lastReservation;

      // 2. Generate the "Paid" QR Data
      const paidAt = new Date().toISOString();
      const qrData = JSON.stringify({
        reservationId: reservation.id,
        name: reservation.name,
        date: reservation.date,
        time: reservation.time,
        guests: reservation.guests,
        email: reservation.email,
        paid: true, // ✅ Status updated
        paidAt: paidAt,
      });

      // 3. ✅ Restored: Extract Image from Canvas
      // We give the browser a tick to render the hidden canvas if needed
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      let qrImageUrl = null;
      if (qrRef.current) {
        const canvas = qrRef.current.querySelector('canvas');
        if (canvas) {
          qrImageUrl = canvas.toDataURL('image/png');
        }
      }

      // 4. ✅ Restored: Upload logic (Safe Mode)
      // If /api/upload-qr doesn't exist, this block will fail gracefully 
      // without freezing the app.
      let qrImageS3Url = null;
      if (qrImageUrl) {
        try {
          const blob = await (await fetch(qrImageUrl)).blob();
          const formData = new FormData();
          formData.append('file', blob, `qr_${reservation.id}_paid.png`);
          formData.append('reservationId', String(reservation.id));
          
          // Note: You must have this route on your backend for this to work!
          const uploadRes = await fetch('/api/upload-qr', {
            method: 'POST',
            body: formData,
          });
          
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            qrImageS3Url = data.url;
          }
        } catch (err) {
          console.warn('QR upload skipped (route might be missing), continuing...', err);
        }
      }

      // 5. Finalize
      // We use the S3 URL if upload worked, otherwise we fall back to the text data
      markReservationPaid(reservation.id, qrImageS3Url || qrData);
      
      setIsSuccess(true);
      setTimeout(() => {
        navigate("/reservations");
      }, 3000);

    } catch (err) {
      console.error("Payment failed", err);
    } finally {
      setIsProcessing(false);
    }
  }

  // --- VIEW 1: SUCCESS SCREEN ---
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 md:p-12 rounded-2xl border border-primary/20 text-center">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }} className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-primary" />
              </div>
            </motion.div>
            <h2 className="font-serif text-3xl font-bold mb-3 text-foreground">Payment Successful!</h2>
            <p className="text-foreground/70 mb-2">Deposit of ${depositAmount}.00 received</p>
            <p className="text-sm text-foreground/60 mb-6">Your reservation is confirmed.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- VIEW 2: MISSING DATA FALLBACK ---
  if (!lastReservation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">No pending reservation found.</p>
        <Button onClick={() => navigate("/reservations")}>View My Reservations</Button>
      </div>
    );
  }

  const reservation = lastReservation;

  // --- VIEW 3: PAYMENT FORM ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
      
      {/* ✅ Restored: Hidden QR Canvas */}
      {/* It is rendered off-screen so we can extract the image data via ref */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} ref={qrRef} aria-hidden="true">
        <QRCodeCanvas
          value={JSON.stringify({
            reservationId: reservation.id,
            name: reservation.name,
            paid: true,
            paidAt: new Date().toISOString()
          })}
          size={256}
          level="H"
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-serif text-4xl font-bold mb-2 text-foreground">Secure Deposit</h1>
          <p className="text-foreground/70">Complete your booking for <strong>Lumière Bistro</strong></p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Summary Column */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-6 border border-primary/20 shadow-sm">
            <h2 className="font-serif text-2xl font-bold mb-6 text-foreground">Reservation Summary</h2>
            <div className="space-y-4 mb-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
               {/* Display details */}
              <div className="flex justify-between">
                <span className="text-foreground/70">Date</span>
                <span className="font-semibold text-foreground">{format(parseISO(reservation.date), "MMM dd, yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Time</span>
                <span className="font-semibold text-foreground">{reservation.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Name</span>
                <span className="font-semibold text-foreground">{reservation.name}</span>
              </div>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-4 border-primary/20">
              <span>Total Deposit</span>
              <span className="text-primary">${depositAmount}.00</span>
            </div>
          </motion.div>

          {/* Payment Form Column */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-card to-card/90 rounded-2xl p-6 border border-primary/20 shadow-xl">
            <h2 className="font-serif text-2xl font-bold mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> Payment Details
            </h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="cardName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name on Card</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} disabled={isProcessing} className="bg-background/80" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Number</FormLabel>
                      <FormControl><Input placeholder="4111111111111111" {...field} disabled={isProcessing} maxLength={16} className="bg-background/80 font-mono" /></FormControl>
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
                        <FormControl><Input placeholder="MM/YY" {...field} disabled={isProcessing} maxLength={5} className="bg-background/80 font-mono" /></FormControl>
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
                        <FormControl><Input placeholder="123" type="password" {...field} disabled={isProcessing} maxLength={4} className="bg-background/80 font-mono" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={isProcessing} className="w-full h-12 text-lg font-serif bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                  {isProcessing ? "Processing Payment..." : `Pay $${depositAmount}.00 Deposit`}
                </Button>
              </form>
            </Form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}