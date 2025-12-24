import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "../lib/queryClient"; // Import directly at the top

export interface User {
  id: number; // Changed to number to match your RDS serial ID
  name: string;
  email: string;
}

export interface Reservation {
  id: number;
  userId: number;
  name: string;
  email: string;
  date: string;
  time: string;
  guests: number;
  createdAt: string;
  paid?: boolean;
  qrCode?: string;
}

interface AuthContextType {
  user: User | null;
  reservations: Reservation[];
  lastReservation: Reservation | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  addReservation: (reservation: Omit<Reservation, "id" | "userId" | "createdAt">) => Promise<Reservation>;
  cancelReservation: (reservationId: number) => void;
  markReservationPaid: (reservationId: number, qrCodeData?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [lastReservation, setLastReservation] = useState<Reservation | null>(null);

  // Load from RDS-session (or local fallback) on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("lumiere_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const register = async (name: string, email: string, password: string, phone?: string) => {
    // Hits the /api/register route in your auth.ts
    const res = await apiRequest("POST", "/api/register", { name, email, password, phone });
    const newUser = await res.json();
    setUser(newUser);
    localStorage.setItem("lumiere_user", JSON.stringify(newUser));
  };

  const login = async (email: string, password: string) => {
    // Authenticates via Passport.js on your EC2 instance
    const res = await apiRequest("POST", "/api/login", { email, password });
    const loggedUser = await res.json();
    setUser(loggedUser);
    localStorage.setItem("lumiere_user", JSON.stringify(loggedUser));
  };

  const logout = async () => {
    await apiRequest("POST", "/api/logout");
    setUser(null);
    localStorage.removeItem("lumiere_user");
  };

  const addReservation = async (reservation: Omit<Reservation, "id" | "userId" | "createdAt">) => {
    if (!user) throw new Error("User not authenticated");
    // Saves to the 'reservations' table in RDS
    const res = await apiRequest("POST", "/api/reservations", reservation);
    const newReservation = await res.json();
    setReservations(prev => [...prev, newReservation]);
    setLastReservation(newReservation);
    return newReservation;
  };

  const cancelReservation = (reservationId: number) => {
    setReservations(prev => prev.filter((res) => res.id !== reservationId));
  };

  const markReservationPaid = (reservationId: number, qrCodeData?: string) => {
    setReservations(prev =>
      prev.map((res) =>
        res.id === reservationId ? { ...res, paid: true, qrCode: qrCodeData } : res
      )
    );
  };

  return (
    <AuthContext.Provider value={{ 
      user, reservations, lastReservation, login, logout, 
      addReservation, cancelReservation, markReservationPaid, register 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}