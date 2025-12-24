// import { db } from "./db";
// import {
//   users, categories, menuItems, reservations,
//   type User, type InsertUser,
//   type Category, type InsertCategory,
//   type MenuItem, type InsertMenuItem,
//   type Reservation, type InsertReservation
// } from "@shared/schema";
// import { eq } from "drizzle-orm";

// export interface IStorage {
//   // User methods
//   getUser(id: number): Promise<User | undefined>;
//   getUserByUsername(username: string): Promise<User | undefined>;
//   createUser(user: InsertUser): Promise<User>;

//   // Menu methods
//   getCategories(): Promise<Category[]>;
//   getCategory(id: number): Promise<Category | undefined>;
//   getMenuItems(categoryId?: number): Promise<MenuItem[]>;
//   getMenuItem(id: number): Promise<MenuItem | undefined>;
  
//   // Reservation methods
//   createReservation(reservation: InsertReservation): Promise<Reservation>;
  
//   // Seed/Admin methods
//   createCategory(category: InsertCategory): Promise<Category>;
//   createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
// }

// export class DatabaseStorage implements IStorage {
//   // User implementation
//   async getUser(id: number): Promise<User | undefined> {
//     const [user] = await db.select().from(users).where(eq(users.id, id));
//     return user;
//   }

//   async getUserByUsername(username: string): Promise<User | undefined> {
//     const [user] = await db.select().from(users).where(eq(users.username, username));
//     return user;
//   }

//   async createUser(insertUser: InsertUser): Promise<User> {
//     const [user] = await db.insert(users).values(insertUser).returning();
//     return user;
//   }

//   // Menu implementation
//   async getCategories(): Promise<Category[]> {
//     return await db.select().from(categories).orderBy(categories.id);
//   }

//   async getCategory(id: number): Promise<Category | undefined> {
//     const [category] = await db.select().from(categories).where(eq(categories.id, id));
//     return category;
//   }

//   async getMenuItems(categoryId?: number): Promise<MenuItem[]> {
//     if (categoryId) {
//       return await db.select().from(menuItems).where(eq(menuItems.categoryId, categoryId));
//     }
//     return await db.select().from(menuItems);
//   }

//   async getMenuItem(id: number): Promise<MenuItem | undefined> {
//     const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
//     return item;
//   }

//   async createReservation(insertReservation: InsertReservation): Promise<Reservation> {
//     const [reservation] = await db.insert(reservations).values(insertReservation).returning();
//     return reservation;
//   }

//   async createCategory(category: InsertCategory): Promise<Category> {
//     const [newCategory] = await db.insert(categories).values(category).returning();
//     return newCategory;
//   }

//   async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
//     const [newItem] = await db.insert(menuItems).values(item).returning();
//     return newItem;
//   }
// }

// // export const storage = new DatabaseStorage();
// export const storage = new MemStorage();

import { users, type User, type InsertUser } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// 1. Define the interface (The rules our storage must follow)
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // These are the methods your app tried to call earlier
  getCategories(): Promise<any[]>;
  getAllMenuItems(): Promise<any[]>;
  createCategory(category: any): Promise<any>;
  createMenuItem(item: any): Promise<any>;
  
  sessionStore: session.Store;
}

// 2. Create the Memory Storage class (The "Fake Database")
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, any>;
  private menuItems: Map<number, any>;
  currentId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.menuItems = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // --- Mock Menu Methods to prevent crashes ---
  async getCategories() {
    return Array.from(this.categories.values());
  }

  async createCategory(category: any) {
    const id = this.currentId++;
    const newCat = { ...category, id };
    this.categories.set(id, newCat);
    return newCat;
  }

  async getAllMenuItems() {
    return Array.from(this.menuItems.values());
  }

  async createMenuItem(item: any) {
    const id = this.currentId++;
    const newItem = { ...item, id };
    this.menuItems.set(id, newItem);
    return newItem;
  }
}

// 3. Export the storage instance
export const storage = new MemStorage();