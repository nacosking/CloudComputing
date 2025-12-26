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
  // ✅ ADDED: Missing function definition
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

  // Update reservation as paid in backend and local state
  // ✅ UPDATED FUNCTION
  async function markReservationPaid(id: number, qrData: string) {
    try {
      console.log(`Processing payment for reservation ${id}...`);

      // 1. Call the backend to save the change
      // Note: We use "include" to ensure the session cookie is sent!
      const res = await fetch(`/api/reservations/${id}/pay`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrUrl: qrData }),
        credentials: "include"
      });

      if (!res.ok) throw new Error("Failed to update reservation on server");

      const updatedReservation = await res.json();

      // 2. Update Local State (So UI updates without refresh)
      setReservations((prev) => 
        prev.map((r) => (r.id === id ? updatedReservation : r))
      );
      // Update lastReservation too, so the success screen has the latest data
      setLastReservation(updatedReservation);

      console.log("✅ Payment status synced with server");

    } catch (err) {
      console.error("❌ Error marking reservation as paid:", err);
      // You might want to show a toast error here
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