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

  // ✅ HELPER: Get Authorization Header
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
  };

  async function checkAuth() {
    const token = localStorage.getItem("token");
    // If no token exists, stop loading and return
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/user", {
        headers: { ...getAuthHeaders() }, // ✅ FIXED: Send Token
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        // If token is invalid (401), clear it
        localStorage.removeItem("token");
        setUser(null);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Login failed");
    }

    const data = await res.json();

    // ✅ FIXED: Save Token to LocalStorage
    // Assuming backend returns { token: "...", user: {...} }
    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    // If your backend returns the user object inside data.user, use that.
    // If it returns the user object directly mixed with the token, use data.
    const userObj = data.user || data;
    setUser(userObj);
  }

  async function register(data: RegisterData) {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Registration failed");
    }

    const responseData = await res.json();

    // ✅ FIXED: Save Token on Register too
    if (responseData.token) {
      localStorage.setItem("token", responseData.token);
    }

    const userObj = responseData.user || responseData;
    setUser(userObj);
  }

  async function logout() {
    // Optional: Call API to invalidate token on server if needed
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (e) {
      // ignore logout errors
    }

    // ✅ FIXED: Clear Token
    localStorage.removeItem("token");
    setUser(null);
    setReservations([]);
    setLastReservation(null);
  }

  async function addReservation(reservationData: Omit<Reservation, "id" | "status" | "createdAt" | "qrUrl">): Promise<Reservation> {
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(), // ✅ FIXED: Send Token
        },
        body: JSON.stringify(reservationData),
      });

      if (!response.ok) {
        throw new Error("Failed to save reservation");
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
      const response = await fetch("/api/reservations", {
        headers: { ...getAuthHeaders() }, // ✅ FIXED: Send Token
      });

      if (response.ok) {
        const data = await response.json();
        setReservations(data);
      }
    } catch (error) {
      console.error("Error fetching reservations:", error);
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
        fetchReservations
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