import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Reservation {
  id: string;
  userId: string;
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
  logout: () => void;
  addReservation: (reservation: Omit<Reservation, "id" | "userId" | "createdAt">) => Reservation;
  cancelReservation: (reservationId: string) => void;
  markReservationPaid: (reservationId: string, qrCodeData?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [lastReservation, setLastReservation] = useState<Reservation | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("lumiere_user");
    const storedReservations = localStorage.getItem("lumiere_reservations");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedReservations) {
      setReservations(JSON.parse(storedReservations));
    }
  }, []);

  // Save reservations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("lumiere_reservations", JSON.stringify(reservations));
  }, [reservations]);

  const login = async (email: string, password: string) => {
    // Mock authentication - in real app, this would call a backend
    if (!email || password.length < 1) {
      throw new Error("Invalid credentials");
    }

    const mockUser: User = {
      id: `user_${Date.now()}`,
      name: email.split("@")[0],
      email,
    };

    setUser(mockUser);
    localStorage.setItem("lumiere_user", JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("lumiere_user");
  };

  // Look for this in src/contexts/auth-context.tsx
  const addReservation = async (reservationData) => {
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reservationData),
      });

      if (!response.ok) {
        throw new Error("Failed to save reservation");
      }

      const savedReservation = await response.json();
      // Update your local state here if needed
    } catch (error) {
      console.error("Error saving reservation:", error);
    }
  };

  const cancelReservation = (reservationId: string) => {
    setReservations(reservations.filter((res) => res.id !== reservationId));
  };

  const markReservationPaid = (reservationId: string, qrCodeData?: string) => {
    setReservations(
      reservations.map((res) =>
        res.id === reservationId ? { ...res, paid: true, qrCode: qrCodeData } : res
      )
    );
  };

  return (
    <AuthContext.Provider value={{ user, reservations, lastReservation, login, logout, addReservation, cancelReservation, markReservationPaid }}>
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
