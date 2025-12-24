import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { Trash2, Calendar, Users, Clock, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function ReservationsPage() {
  const [, navigate] = useLocation();
  const { user, reservations, logout, cancelReservation } = useAuth();
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleCancel = (reservationId: string) => {
    setCancelingId(reservationId);
    setTimeout(() => {
      cancelReservation(reservationId);
      setCancelingId(null);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-foreground text-background py-6 border-b border-border">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div>
            <Link href="/">
              <a className="font-serif text-2xl font-bold mb-2 block">
                Lumière<span className="text-primary">.</span>
              </a>
            </Link>
            <p className="text-foreground/60">Welcome, <span className="font-semibold">{user.name}</span></p>
          </div>
          <div className="flex gap-4">
            <Button asChild variant="outline" className="border-background/30 text-background hover:bg-background hover:text-foreground">
              <a href="/">Home</a>
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-background hover:bg-background/20"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="mb-12">
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-2">Your Reservations</h1>
          <p className="text-muted-foreground text-lg">Manage all your bookings at Lumière</p>
        </div>

        {reservations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-muted/30 rounded-xl border border-border"
          >
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="font-serif text-2xl font-bold mb-2">No Reservations Yet</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              You haven't made any reservations yet. Book a table at Lumière to get started.
            </p>
            <Button asChild className="rounded-full px-8">
              <a href="/#book">Book a Table</a>
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-6">
            {reservations.map((reservation, idx) => (
              <motion.div
                key={reservation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`bg-card border border-border rounded-xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all ${cancelingId === reservation.id ? "opacity-50" : ""
                  }`}
              >
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-serif text-2xl font-bold mb-6">Reservation Details</h3>

                    <div className="space-y-4">
                      <div>
                        <p className="text-muted-foreground text-sm uppercase tracking-wider mb-1">Name</p>
                        <p className="font-medium text-lg">{reservation.name}</p>
                      </div>

                      <div>
                        <p className="text-muted-foreground text-sm uppercase tracking-wider mb-1">Email</p>
                        <p className="text-foreground">{reservation.email}</p>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex flex-col items-center">
                            <Calendar className="w-5 h-5 text-primary mb-2" />
                            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Date</p>
                            <p className="font-semibold">
                              {format(parseISO(reservation.date), "MMM dd")}
                            </p>
                          </div>

                          <div className="flex flex-col items-center">
                            <Clock className="w-5 h-5 text-primary mb-2" />
                            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Time</p>
                            <p className="font-semibold">
                              {reservation.time}
                            </p>
                          </div>

                          <div className="flex flex-col items-center">
                            <Users className="w-5 h-5 text-primary mb-2" />
                            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Guests</p>
                            <p className="font-semibold">
                              {reservation.guests}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between">
                    {reservation.paid && reservation.qrCode ? (
                      <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-6 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                          <h4 className="font-serif text-lg font-bold">Deposit Paid</h4>
                        </div>
                        <p className="text-muted-foreground text-sm mb-4">
                          Show this QR code when you arrive at the restaurant.
                        </p>
                        <div className="bg-background rounded-lg p-4 flex justify-center border border-primary/30">
                          <QRCodeCanvas
                            value={reservation.qrCode}
                            size={160}
                            level="H"
                            includeMargin={true}
                            bgColor="#ffffff"
                            fgColor="#000000"
                          />
                        </div>
                        <div className="mt-4 p-3 bg-primary/5 rounded border border-primary/20">
                          <p className="text-xs text-muted-foreground mb-1">Confirmation ID</p>
                          <p className="font-mono text-xs font-bold text-primary">{reservation.id}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mb-6">
                        <h4 className="font-serif text-lg font-bold mb-3">Confirmation</h4>
                        <p className="text-muted-foreground text-sm mb-4">
                          Your table is reserved and waiting for you.
                          Please arrive 5-10 minutes early.
                        </p>
                        <div className="p-3 bg-background rounded border border-primary/30">
                          <p className="text-xs text-muted-foreground mb-1">Reservation ID</p>
                          <p className="font-mono text-sm font-bold text-primary">{reservation.id}</p>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => handleCancel(reservation.id)}
                      variant="ghost"
                      className="w-full border border-red-200 text-red-600 hover:bg-red-50 group"
                    >
                      <Trash2 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Cancel Reservation
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
