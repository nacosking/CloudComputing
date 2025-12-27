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
  isPaid?: boolean;
}

interface RegisterData {
  username: string;
  name: string;
  email: string;
  password: string;
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
  markReservationPaid: (id: number, qrData: string) => Promise<void>;
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

  // 🔥 FIXED: Don't auto-fetch on user change - we do it explicitly in login/register
  useEffect(() => {
    if (!user) {
      setReservations([]);
    }
  }, [user]);

  async function checkAuth() {
    try {
      const res = await fetch("/api/user", { credentials: "include" });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        // Fetch reservations after successful auth check
        await new Promise(resolve => setTimeout(resolve, 100));
        await fetchReservationsInternal();
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
    
    // 🔥 FIX 1: Wait 500ms (half a second) to let the cookie settle
    console.log("⏳ Login complete, waiting for cookie to settle...");
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 🔥 FIX 2: Now fetch with retry logic
    await fetchReservationsInternal();
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
    
    // 🔥 FIX: Increased wait time + retry logic handles edge cases
    await new Promise(resolve => setTimeout(resolve, 200));
    await fetchReservationsInternal();
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
      console.error("Error saving reservation:", error);
      throw error;
    }
  }

  // 🔥 IMPROVED: Internal function with retry logic
  // 🔥 ULTIMATE FETCH: Retry Logic + Cache Busting + Headers
  async function fetchReservationsInternal(retryCount = 0) {
    try {
      console.log(`🔍 Fetching reservations... (attempt ${retryCount + 1})`);
      
      // 1. Add Timestamp (?_t=...) to force a unique URL (Bypasses URL cache)
      const uniqueUrl = `/api/reservations?_t=${Date.now()}`;
      
      const response = await fetch(uniqueUrl, { 
        credentials: "include",
        // 2. Add Headers to forbid browser caching
        headers: { 
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Fetched", data.length, "reservations");
        setReservations(data);
      } else if (response.status === 401 && retryCount < 3) {
        // Session might not be saved yet, retry...
        console.log(`⏳ Session/Cache issue, retrying in ${200 * (retryCount + 1)}ms...`);
        await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
        return fetchReservationsInternal(retryCount + 1);
      } else {
        console.log("❌ Failed to fetch reservations:", response.status);
      }
    } catch (error) {
      console.error("Error fetching reservations:", error);
      
      // Retry on network errors too
      if (retryCount < 3) {
        console.log(`⏳ Network error, retrying in ${200 * (retryCount + 1)}ms...`);
        await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
        return fetchReservationsInternal(retryCount + 1);
      }
    }
  }

  // Public function for manual refresh
  async function fetchReservations() {
    await fetchReservationsInternal();
  }

  function cancelReservation(id: string) {
    setReservations((prev) => prev.filter((r) => r.id.toString() !== id));
  }

  async function markReservationPaid(id: number, qrData: string) {
    try {
      console.log(`Processing payment for reservation ${id}...`);

      const res = await fetch(`/api/reservations/${id}/pay`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrUrl: qrData }),
        credentials: "include"
      });

      if (!res.ok) throw new Error("Failed to update reservation on server");

      const updatedReservation = await res.json();

      setReservations((prev) => 
        prev.map((r) => (r.id === id ? updatedReservation : r))
      );
      setLastReservation(updatedReservation);

      console.log("✅ Payment status synced with server");

    } catch (err) {
      console.error("❌ Error marking reservation as paid:", err);
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
        markReservationPaid
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