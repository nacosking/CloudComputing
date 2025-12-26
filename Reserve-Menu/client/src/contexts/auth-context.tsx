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

// ✅ 1. Added markReservationPaid to the definition here
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
      const res = await fetch("/api/user", { credentials: "include" });
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
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch (e) {
      console.error("Logout error:", e);
    }
    setUser(null);
    setReservations([]);
    setLastReservation(null);
  }

  async function addReservation(reservationData: Omit<Reservation, "id" | "status" | "createdAt" | "qrUrl">): Promise<Reservation> {
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

  // ✅ 2. THIS IS THE MISSING FUNCTION CAUSING THE FREEZE
  function markReservationPaid(id: number, qrData: string) {
    console.log(`Checking off payment for reservation ${id}`);

    // Update the list of reservations
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isPaid: true, qrUrl: qrData } : r))
    );

    // Update the "current" reservation so the payment page knows it is done
    if (lastReservation && lastReservation.id === id) {
      setLastReservation({ ...lastReservation, isPaid: true, qrUrl: qrData });
    }
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
        markReservationPaid, // ✅ 3. Exported here
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