import { 
  users, categories, menuItems, reservations,
  type User, type InsertUser, 
  type Category, type InsertCategory,
  type MenuItem, type InsertMenuItem,
  type Reservation, type InsertReservation 
} from "@shared/schema";
import { db } from "./db"; // This connects to your real AWS RDS
import { eq } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// ---------------------------------------------------------
// 1. Interface Definition
// ---------------------------------------------------------
export interface IStorage {
  // User Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Menu
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  getAllMenuItems(): Promise<MenuItem[]>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;

  // Reservations
  createReservation(reservation: InsertReservation): Promise<Reservation>;

  // Session Store (We still use MemoryStore for sessions for simplicity, 
  // but you can switch to connect-pg-simple for DB sessions later)
  sessionStore: session.Store;
}

// ---------------------------------------------------------
// 2. Database Storage (The Real AWS RDS Implementation)
// ---------------------------------------------------------
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // --- USER METHODS ---

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // This connects to RDS and finds the user by email
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // This inserts the user into RDS and returns the new row
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // --- MENU METHODS ---

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  async getAllMenuItems(): Promise<MenuItem[]> {
    return await db.select().from(menuItems);
  }

  async createMenuItem(insertItem: InsertMenuItem): Promise<MenuItem> {
    const [item] = await db.insert(menuItems).values(insertItem).returning();
    return item;
  }

  // --- RESERVATION METHODS ---

  async createReservation(insertReservation: InsertReservation): Promise<Reservation> {
    const [reservation] = await db
      .insert(reservations)
      .values(insertReservation)
      .returning();
    return reservation;
  }
}

// Export the Database Instance
export const storage = new DatabaseStorage();