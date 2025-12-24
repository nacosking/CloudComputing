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
  cardName: z.string().min(2),
  cardNumber: z.string().regex(/^\d{16}$/),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/),
  cvv: z.string().regex(/^\d{3,4}$/),
})

export default function PaymentPage() {
  const [, navigate] = useLocation()
  const { lastReservation, markReservationPaid } = useAuth()

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
  })
}
