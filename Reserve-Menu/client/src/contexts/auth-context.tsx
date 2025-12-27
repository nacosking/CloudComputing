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

// ✅ Helper: Wait with exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [lastReservation, setLastReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      console.log("🔍 Checking authentication...");
      const res = await fetch("/api/user", { credentials: "include" });
      
      if (res.ok) {
        const userData = await res.json();
        console.log("✅ User authenticated:", userData.email);
        setUser(userData);
        await fetchReservations(); 
      } else {
        console.log("ℹ️ No active session (this is normal on page load)");
        setUser(null);
      }
    } catch (err) {
      console.error("❌ Auth check failed:", err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    console.log("🔐 Logging in:", email);
    
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
    console.log("✅ Login successful:", userData.email);
    setUser(userData);

    // ✅ CRITICAL: Wait a moment for session to fully propagate
    await sleep(300);
    
    console.log("📋 Fetching user reservations...");
    await fetchReservationsWithRetry();
  }

  async function register(data: RegisterData) {
    console.log("📝 Registering new user:", data.email);
    
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
    console.log("✅ Registration successful:", userData.email);
    setUser(userData);
    
    // ✅ CRITICAL: Wait for session to propagate
    await sleep(300);
    
    console.log("📋 Fetching user reservations...");
    await fetchReservationsWithRetry();
  }

  async function logout() {
    console.log("👋 Logging out...");
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
    console.log("✅ Logged out successfully");
  }

  async function addReservation(reservationData: Omit<Reservation, "id" | "status" | "createdAt" | "qrUrl">): Promise<Reservation> {
    try {
      console.log("🎫 Creating reservation...");
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
      console.log("✅ Reservation created:", savedReservation.id);
      setLastReservation(savedReservation);
      setReservations((prev) => [...prev, savedReservation]);
      return savedReservation;
    } catch (error) {
      console.error("❌ Error saving reservation:", error);
      throw error;
    }
  }

  // ✅ NEW: Retry logic for session propagation issues
  async function fetchReservationsWithRetry(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`/api/reservations?_t=${Date.now()}`, { 
          credentials: "include",
          headers: { "Cache-Control": "no-cache" } 
        });

        if (res.ok) {
          const data = await res.json();
          console.log(`✅ Fetched ${data.length} reservations (attempt ${attempt})`);
          setReservations(data);
          return; // Success!
        } else if (res.status === 401 && attempt < maxRetries) {
          // Session not ready yet, wait and retry
          console.log(`⏳ Session not ready (attempt ${attempt}), retrying in ${attempt * 200}ms...`);
          await sleep(attempt * 200); // Exponential backoff
          continue;
        } else {
          console.log("ℹ️ No reservations found or not authenticated");
          setReservations([]);
          return;
        }
      } catch (error) {
        console.error(`❌ Error fetching reservations (attempt ${attempt}):`, error);
        if (attempt === maxRetries) {
          setReservations([]);
        }
      }
    }
  }

  async function fetchReservations() {
    try {
      const res = await fetch(`/api/reservations?_t=${Date.now()}`, { 
        credentials: "include",
        headers: { "Cache-Control": "no-cache" } 
      });

      if (res.ok) {
        const data = await res.json();
        console.log("✅ Fetched", data.length, "reservations");
        setReservations(data);
      } else {
        console.log("ℹ️ No reservations found or not authenticated");
        setReservations([]);
      }
    } catch (error) {
      console.error("❌ Error fetching reservations:", error);
    }
  }

  function cancelReservation(id: string) {
    console.log("🗑️ Canceling reservation:", id);
    setReservations((prev) => prev.filter((r) => r.id.toString() !== id));
  }

  async function markReservationPaid(id: number, qrData: string) {
    try {
      console.log(`💳 Processing payment for reservation ${id}...`);

      const res = await fetch(`/api/reservations/${id}/pay`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrUrl: qrData }),
        credentials: "include"
      });

      if (!res.ok) throw new Error("Failed to update reservation on server");

      const updatedReservation = await res.json();
      console.log("✅ Payment processed successfully");

      setReservations((prev) => 
        prev.map((r) => (r.id === id ? updatedReservation : r))
      );
      setLastReservation(updatedReservation);

    } catch (err) {
      console.error("❌ Error marking reservation as paid:", err);
      throw err;
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