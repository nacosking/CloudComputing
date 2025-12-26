import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  isAdmin?: boolean;
}

export interface Reservation {
  id: number;
  name: string;
  email: string;
  date: string;
  time: string;
  guests: number;
  createdAt?: string;
  isPaid?: boolean;
  qrUrl?: string;
}

interface RegisterData {
  username: string;
  name: string;
  email: string;
  password: string;
}

// ✅ UPDATED: Added markReservationPaid to the interface
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  reservations: Reservation[];
  lastReservation: Reservation | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  addReservation: (reservation: Omit<Reservation, "id" | "status" | "createdAt" | "qrUrl">) => Promise<Reservation>;
  fetchReservations: () => Promise<void>;
  cancelReservation: (id: string) => void;
  markReservationPaid: (id: number, qrData: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [lastReservation, setLastReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchReservations();
    } else {
      setReservations([]);
    }
  }, [user]);

  async function checkAuth() {
    try {
      const res = await fetch("/api/user", {
        credentials: "include",
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Login failed");
    }

    const userData = await res.json();
    setUser(userData);
  }

  async function register(data: RegisterData) {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Registration failed");
    }

    const userData = await res.json();
    setUser(userData);
  }

  async function logout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (e) {
      console.error("Logout error:", e);
    }
    setUser(null);
    setReservations([]);
    setLastReservation(null);
  }

  async function addReservation(reservationData: Omit<Reservation, "id" | "status" | "createdAt" | "qrUrl">): Promise<Reservation> {
    console.log("🎯 [AUTH-CONTEXT] Starting reservation submission");
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(reservationData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save reservation");
      }

      const savedReservation = await response.json();
      setLastReservation(savedReservation);
      setReservations((prev) => [...prev, savedReservation]);
      return savedReservation;
    } catch (error) {
      console.error("❌ Reservation submission error:", error);
      throw error;
    }
  }

  async function fetchReservations() {
    try {
      const response = await fetch("/api/reservations", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setReservations(data);
      }
    } catch (error) {
      console.error("Error fetching reservations:", error);
    }
  }

  function cancelReservation(id: string) {
    setReservations((prev) => prev.filter((r) => r.id.toString() !== id));
  }

  // ✅ ADDED: The missing function that caused the freeze
  function markReservationPaid(id: number, qrData: string) {
    // Update local state so UI updates immediately
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isPaid: true, qrUrl: qrData } : r))
    );

    if (lastReservation && lastReservation.id === id) {
      setLastReservation({ ...lastReservation, isPaid: true, qrUrl: qrData });
    }

    // NOTE: In a real app, you would fetch('/api/reservations/'+id+'/pay') here
    // to update the database. For now, this updates the frontend state.
    console.log(`Reservation ${id} marked as paid.`);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        reservations,
        lastReservation,
        login,
        register,
        logout,
        checkAuth,
        addReservation,
        fetchReservations,
        cancelReservation,
        markReservationPaid, // ✅ Included in provider
      }}
    >
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