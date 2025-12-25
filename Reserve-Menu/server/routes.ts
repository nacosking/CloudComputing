import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertReservationSchema } from "@shared/schema";
import { z } from "zod";
import { createServer } from "http";
import { Pool } from "pg";

// 1. Setup Database Connection for the NEW Dynamic Menu
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://dbadmin:SecurePass2025@cloud-project-db.cu8gzw5dvnqx.us-east-1.rds.amazonaws.com:5432/appdb?sslmode=require",
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // --- PRESERVED LOGIC: Authentication ---
  setupAuth(app);

  // ============================================================
  //  NEW FEATURE: ADMIN MENU MANAGEMENT (Direct RDS Access)
  // ============================================================

  // 1. GET MENU (For Customers & Admin)
  app.get('/api/menu', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM menu_items ORDER BY id ASC');
      // Format for frontend tabs
      const menuData: Record<string, any[]> = { breakfast: [], lunch: [], dinner: [] };
      result.rows.forEach(item => {
        if (!menuData[item.category]) menuData[item.category] = [];
        menuData[item.category].push(item);
      });
      res.json(menuData);
    } catch (err) {
      console.error("DB Error:", err);
      // Fallback to empty if DB fails, so app doesn't crash
      res.json({ breakfast: [], lunch: [], dinner: [] });
    }
  });

  // 2. ADD ITEM (For Admin)
  app.post('/api/menu', async (req, res) => {
    const { category, name, price, description } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO menu_items (category, name, price, description) VALUES ($1, $2, $3, $4) RETURNING *',
        [category, name, price, description]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("DB Add Error:", err);
      res.status(500).json({ error: 'Failed to add item' });
    }
  });

  // 3. UPDATE ITEM (For Admin) - NEW!
  app.put('/api/menu/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price, description, category } = req.body;
    try {
      const result = await pool.query(
        'UPDATE menu_items SET name = $1, price = $2, description = $3, category = $4 WHERE id = $5 RETURNING *',
        [name, price, description, category, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("DB Update Error:", err);
      res.status(500).json({ error: 'Failed to update item' });
    }
  });

  // 4. DELETE ITEM (For Admin) - NEW!
  app.delete('/api/menu/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM menu_items WHERE id = $1', [id]);
      res.json({ message: 'Item deleted' });
    } catch (err) {
      console.error("DB Delete Error:", err);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });

  // ============================================================
  //  PRESERVED LOGIC: OLD ROUTES (Reservations & Legacy Menu)
  // ============================================================

  app.get("/api/categories", async (req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.get("/api/categories/:id", async (req, res) => {
    const category = await storage.getCategory(Number(req.params.id));
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  });

  app.get("/api/menu-items", async (req, res) => {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const items = await storage.getMenuItems(categoryId);
    res.json(items);
  });

  app.get("/api/menu-items/:id", async (req, res) => {
    const item = await storage.getMenuItem(Number(req.params.id));
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    res.json(item);
  });

  // RESERVATIONS (Untouched)
  app.post("/api/reservations", async (req, res) => {
    try {
      const input = insertReservationSchema.parse(req.body);
      const reservation = await storage.createReservation(input);
      res.status(201).json(reservation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Seed (Optional/Untouched)
  try { await seedDatabase(); } catch (e) { /* ignore seed errors */ }

  return httpServer;
}

// Keep the seed function exactly as it was
export async function seedDatabase() {
  const categories = await storage.getCategories();
  if (categories.length === 0) {
    const starters = await storage.createCategory({ name: "Starters", slug: "starters" });
    const mains = await storage.createCategory({ name: "Mains", slug: "mains" });
    const desserts = await storage.createCategory({ name: "Desserts", slug: "desserts" });
    const drinks = await storage.createCategory({ name: "Drinks", slug: "drinks" });

    await storage.createMenuItem({ categoryId: starters.id, name: "Bruschetta", description: "Grilled bread...", price: 800, available: true, imageUrl: "..." });
    await storage.createMenuItem({ categoryId: mains.id, name: "Grilled Salmon", description: "Fresh atlantic...", price: 2400, available: true, imageUrl: "..." });
    await storage.createMenuItem({ categoryId: mains.id, name: "Ribeye Steak", description: "12oz ribeye...", price: 3200, available: true, imageUrl: "..." });
    await storage.createMenuItem({ categoryId: desserts.id, name: "Tiramisu", description: "Coffee-flavoured...", price: 900, available: true, imageUrl: "..." });
  }
}