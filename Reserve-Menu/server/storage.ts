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
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"; // AWS SDK v3
import QRCode from "qrcode"; // QR Code Generator

const MemoryStore = createMemoryStore(session);

// AWS S3 Configuration - Using LabRole (no credentials needed)
const s3Client = new S3Client({ region: "us-east-1" });
const BUCKET_NAME = "customer-reservations-qr-759145289015";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getMenuItems(categoryId?: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservationQrUrl(id: number, qrUrl: string): Promise<Reservation>;
  createCategory(category: InsertCategory): Promise<Category>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // --- Reservation Logic with S3 ---
  async createReservation(insertReservation: InsertReservation): Promise<Reservation> {
    // 1. Insert reservation into DB first to get an ID
    const [reservation] = await db.insert(reservations).values(insertReservation).returning();

    try {
      // 2. Generate QR Code as a Buffer
      // We encode the reservation ID and name for the QR data
      const qrData = JSON.stringify({
        id: reservation.id,
        name: reservation.name,
        date: reservation.date
      });
      const qrBuffer = await QRCode.toBuffer(qrData);

      // 3. Upload to S3
      const fileName = `reservations/${reservation.id}/qr.png`;
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: qrBuffer,
        ContentType: "image/png"
      }));

      // 4. Update the DB with the new S3 URL
      const qrUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
      return await this.updateReservationQrUrl(reservation.id, qrUrl);

    } catch (error) {
      console.error("QR/S3 Error:", error);
      // Fallback: return the reservation even if QR fails
      return reservation;
    }
  }


  // ... rest of your existing methods (getUser, getCategories, etc.) ...
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.id);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

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

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [newItem] = await db.insert(menuItems).values(item).returning();
    return newItem;
  }
}

export const storage = new DatabaseStorage();