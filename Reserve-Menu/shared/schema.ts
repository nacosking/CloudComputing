import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------
// 1. USERS TABLE (Email Login)
// ---------------------------------------------------------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  
  // Login Credentials
  email: text("email").notNull().unique(), // Unique key for login
  password: text("password").notNull(),    // Hashed password
  
  // Profile Details
  name: text("name").notNull(),             
  phone: text("phone"),                     
  
  // System Fields
  role: text("role").default("customer").notNull(),
});

// ---------------------------------------------------------
// 2. MENU TABLES
// ---------------------------------------------------------
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // in cents
  imageUrl: text("image_url"),
  available: boolean("available").default(true).notNull(),
});

// ---------------------------------------------------------
// 3. RESERVATIONS TABLE (AWS Integrated)
// ---------------------------------------------------------
export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  
  // Contact Info
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"), 
  
  // Booking Details
  date: text("date").notNull(), 
  time: text("time").notNull(),
  guests: integer("guests").notNull(),
  
  // Status & AWS Fields
  status: text("status").default("pending").notNull(), // Starts as pending until paid
  paid: boolean("paid").default(false).notNull(),      // Tracks payment status
  qrCodeUrl: text("qr_code_url"),                      // Link to S3 Image
  
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------
// 4. RELATIONS
// ---------------------------------------------------------
export const categoryRelations = relations(categories, ({ many }) => ({
  items: many(menuItems),
}));

export const menuItemRelations = relations(menuItems, ({ one }) => ({
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  // reservations: many(reservations), 
}));

// ---------------------------------------------------------
// 5. ZOD SCHEMAS & TYPES
// ---------------------------------------------------------

// User Schema: Omit 'id' and 'role' (Security)
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  role: true 
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });

// Reservation Schema: Omit fields that the USER doesn't fill in
export const insertReservationSchema = createInsertSchema(reservations).omit({ 
  id: true, 
  status: true, 
  createdAt: true,
  paid: true,      // Handled by backend after payment
  qrCodeUrl: true  // Handled by backend after upload
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = z.infer<typeof insertReservationSchema>;