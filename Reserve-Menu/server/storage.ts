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
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import QRCode from "qrcode";

const PgSession = connectPgSimple(session);
const s3Client = new S3Client({ region: "us-east-1" });
const BUCKET_NAME = process.env.S3_BUCKET_NAME || "";

const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined
});

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getMenuItems(categoryId?: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  getMenuItemsWithCategories(): Promise<(MenuItem & { categoryName: string; categorySlug?: string })[]>;

  createCategory(category: InsertCategory): Promise<Category>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;

  createReservation(reservation: InsertReservation): Promise<Reservation>;
  getReservations(): Promise<Reservation[]>;
  getReservationsByEmail(email: string): Promise<Reservation[]>;
  updateReservationQrUrl(id: number, qrUrl: string): Promise<Reservation>;
  getSignedQrUrl(s3Key: string): Promise<string>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PgSession({
      pool: sessionPool,
      tableName: "session",
      createTableIfMissing: true,
    });
    console.log("✅ PostgreSQL session store initialized");
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
    console.log("💾 Creating reservation");

    const dataToInsert = {
      name: insertReservation.name,
      email: insertReservation.email,
      date: insertReservation.date,
      time: insertReservation.time,
      guests: insertReservation.guests,
    };

    const [reservation] = await db.insert(reservations).values(dataToInsert).returning();
    console.log("✅ Reservation created:", reservation.id);

    // Generate QR code and upload to S3
    try {
      if (!BUCKET_NAME) {
        console.warn("⚠️ S3_BUCKET_NAME not configured");
        return reservation;
      }

      const qrData = JSON.stringify({
        id: reservation.id,
        name: reservation.name,
        date: reservation.date,
        time: reservation.time,
        guests: reservation.guests
      });

      const qrBuffer = await QRCode.toBuffer(qrData, {
        errorCorrectionLevel: 'H',
        type: 'png',
        width: 300,
        margin: 2,
      });

      const fileName = `reservations/${reservation.id}/qr_${Date.now()}.png`;

      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: qrBuffer,
        ContentType: "image/png",
      }));

      // ✅ Generate a signed URL (valid for 7 days)
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 604800 }); // 7 days
      console.log("✅ QR uploaded with signed URL");

      return await this.updateReservationQrUrl(reservation.id, signedUrl);
    } catch (error) {
      console.error("❌ QR/S3 Error:", error);
      return reservation;
    }
  }

  async getReservations(): Promise<Reservation[]> {
    return await db.select().from(reservations).orderBy(reservations.createdAt);
  }

  async getReservationsByEmail(email: string): Promise<Reservation[]> {
    const reservations = await db.select().from(reservations).where(eq(reservations.email, email));

    // ✅ Regenerate signed URLs if they exist but might be expired
    const updated = await Promise.all(
      reservations.map(async (r) => {
        if (r.qrUrl && r.qrUrl.includes('X-Amz-Signature')) {
          // This is a signed URL that might be expired
          try {
            const key = r.qrUrl.split('.amazonaws.com/')[1]?.split('?')[0];
            if (key) {
              const newSignedUrl = await this.getSignedQrUrl(key);
              return { ...r, qrUrl: newSignedUrl };
            }
          } catch (err) {
            console.error("Error refreshing signed URL:", err);
          }
        }
        return r;
      })
    );

    return updated;
  }

  async updateReservationQrUrl(id: number, qrUrl: string): Promise<Reservation> {
    const [updated] = await db
      .update(reservations)
      .set({ qrUrl })
      .where(eq(reservations.id, id))
      .returning();
    return updated;
  }

  async getSignedQrUrl(s3Key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 604800 });
  }
}

export const storage = new DatabaseStorage();