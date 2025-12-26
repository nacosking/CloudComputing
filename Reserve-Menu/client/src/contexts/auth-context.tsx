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
  userId?: number;
  name: string;
  email: string;
  phone?: string;
  date: string;
  time: string;
  guests: number;
  status: string;
  qrUrl?: string;
  createdAt?: string;
}

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
}

interface RegisterData {
  username: string;
  name: string;
  email: string;
  password: string;
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
      // ✅ FIXED: Use credentials: "include" to send session cookie
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
    // ✅ FIXED: Use credentials: "include" to receive and send session cookie
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
    // ✅ FIXED: Use credentials: "include"
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
      // ✅ FIXED: Use credentials: "include"
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
    console.log("📋 Data being sent:", reservationData);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // ✅ KEEPS THE SESSION ALIVE
        body: JSON.stringify(reservationData),
      });

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error("❌ Server error:", error);
        throw new Error(error.message || "Failed to save reservation");
      }

      const savedReservation = await response.json();
      console.log("✅ Reservation saved! Returned ID:", savedReservation.id);

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
      // ✅ FIXED: Use credentials: "include"
      const response = await fetch("/api/reservations", {
        credentials: "include",
      });

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
        cancelReservation
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