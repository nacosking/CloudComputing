import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Reservations table
export const reservations = pgTable("reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  date: timestamp("date").notNull(),
  time: varchar("time").notNull(),
  guests: integer("guests").notNull(),
  image_url: text("image_url"),
  status: varchar("status").notNull().default("pending"),
  created_at: timestamp("created_at").default(sql`now()`),
});

export const insertReservationSchema = createInsertSchema(reservations).pick({
  name: true,
  email: true,
  date: true,
  time: true,
  guests: true,
  // image_url and status are optional during insert
});

export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservations.$inferSelect;
