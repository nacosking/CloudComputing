import { db } from "./db";
import {
  users, categories, menuItems, reservations,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type MenuItem, type InsertMenuItem,
  type Reservation, type InsertReservation
} from "@shared/schema";
import { eq } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import QRCode from "qrcode";

const MemoryStore = createMemoryStore(session);
const s3Client = new S3Client({ region: "us-east-1" });
const BUCKET_NAME = process.env.S3_BUCKET_NAME || "";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Menu Methods
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getMenuItems(categoryId?: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  getMenuItemsWithCategories(): Promise<(MenuItem & { categoryName: string; categorySlug?: string })[]>;
  
  // Admin Methods
  createCategory(category: InsertCategory): Promise<Category>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;

  // Reservation Methods
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  getReservations(): Promise<Reservation[]>;
  getReservationsByEmail(email: string): Promise<Reservation[]>;
  updateReservationQrUrl(id: number, qrUrl: string): Promise<Reservation>;
  
  // Reservation Methods
  markReservationPaid(id: number, qrUrl: string): Promise<Reservation>; // <--- ADD THIS
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({ checkPeriod: 86400000 });
  }
  
  async markReservationPaid(id: number, qrUrl: string): Promise<Reservation> {
    const [updated] = await db
      .update(reservations)
      .set({ 
        status: "paid", // Update status
        qrUrl: qrUrl    // Update QR URL
      })
      .where(eq(reservations.id, id))
      .returning();
    return updated;
  }

  // ============================================================
  //   USER AUTHENTICATION METHODS
  // ============================================================

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // ============================================================
  //   CATEGORY METHODS
  // ============================================================

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.id);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  // ============================================================
  //   MENU ITEM METHODS
  // ============================================================

  async getMenuItems(categoryId?: number): Promise<MenuItem[]> {
    if (categoryId) {
      return await db.select().from(menuItems).where(eq(menuItems.categoryId, categoryId));
    }
    return await db.select().from(menuItems);
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  async getMenuItemsWithCategories(): Promise<(MenuItem & { categoryName: string; categorySlug?: string })[]> {
    const result = await db
      .select({
        id: menuItems.id,
        categoryId: menuItems.categoryId,
        name: menuItems.name,
        description: menuItems.description,
        price: menuItems.price,
        imageUrl: menuItems.imageUrl,
        available: menuItems.available,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(menuItems)
      .leftJoin(categories, eq(menuItems.categoryId, categories.id));
    
    return result;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [newItem] = await db.insert(menuItems).values(item).returning();
    return newItem;
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem> {
    const [updated] = await db
      .update(menuItems)
      .set(item)
      .where(eq(menuItems.id, id))
      .returning();
    if (!updated) throw new Error("Item not found");
    return updated;
  }

  async deleteMenuItem(id: number): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  // ============================================================
  //   RESERVATION METHODS
  // ============================================================

  async createReservation(insertReservation: InsertReservation): Promise<Reservation> {
    const [reservation] = await db.insert(reservations).values(insertReservation).returning();
    
    // Generate QR code and upload to S3
    try {
      const qrData = JSON.stringify({ 
        id: reservation.id, 
        name: reservation.name, 
        date: reservation.date,
        time: reservation.time,
        guests: reservation.guests
      });
      const qrBuffer = await QRCode.toBuffer(qrData);
      const fileName = `reservations/${reservation.id}/qr_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
      
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: qrBuffer,
        ContentType: "image/png"
      }));

      const qrUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
      return await this.updateReservationQrUrl(reservation.id, qrUrl);
    } catch (error) {
      console.error("QR/S3 Error:", error);
      return reservation;
    }
  }

  async getReservations(): Promise<Reservation[]> {
    return await db.select().from(reservations).orderBy(reservations.createdAt);
  }

  async getReservationsByEmail(email: string): Promise<Reservation[]> {
    return await db.select().from(reservations).where(eq(reservations.email, email));
  }

  async updateReservationQrUrl(id: number, qrUrl: string): Promise<Reservation> {
    const [updated] = await db
      .update(reservations)
      .set({ qrUrl })
      .where(eq(reservations.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();