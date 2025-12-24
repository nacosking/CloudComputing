
import {
  type User, type InsertUser,
  type Category, type InsertCategory,
  type MenuItem, type InsertMenuItem,
  type Reservation, type InsertReservation
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string | number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getCategories(): Promise<Category[]>;
  getCategory(id: string | number): Promise<Category | undefined>;
  getMenuItems(categoryId?: string | number): Promise<MenuItem[]>;
  getMenuItem(id: string | number): Promise<MenuItem | undefined>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  createCategory(category: InsertCategory): Promise<Category>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
}


// In-memory storage for local development
class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private categories: Map<string, Category> = new Map();
  private menuItems: Map<string, MenuItem> = new Map();
  private reservations: Map<string, Reservation> = new Map();
  private categoryAutoId = 1;
  private menuItemAutoId = 1;
  private reservationAutoId = 1;

  async getUser(id: string | number): Promise<User | undefined> {
    return this.users.get(String(id));
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }
  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  async getCategory(id: string | number): Promise<Category | undefined> {
    return this.categories.get(String(id));
  }
  async getMenuItems(categoryId?: string | number): Promise<MenuItem[]> {
    if (categoryId) {
      return Array.from(this.menuItems.values()).filter(m => String(m.categoryId) === String(categoryId));
    }
    return Array.from(this.menuItems.values());
  }
  async getMenuItem(id: string | number): Promise<MenuItem | undefined> {
    return this.menuItems.get(String(id));
  }
  async createReservation(reservation: InsertReservation): Promise<Reservation> {
    const id = this.reservationAutoId++;
    const newReservation: Reservation = { ...reservation, id };
    this.reservations.set(String(id), newReservation);
    return newReservation;
  }
  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.categoryAutoId++;
    const newCategory: Category = { ...category, id };
    this.categories.set(String(id), newCategory);
    return newCategory;
  }
  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const id = this.menuItemAutoId++;
    const newItem: MenuItem = { ...item, id };
    this.menuItems.set(String(id), newItem);
    return newItem;
  }
}

export const storage = new MemStorage();
