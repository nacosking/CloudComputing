import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { insertReservationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // 1. Setup Session Auth (Passport.js)
  setupAuth(app);

  // 2. Automated Startup: Seed the database if empty
  (async () => {
    try {
      await seedDatabase();
    } catch (e) {
      console.error("Startup Seed Error:", e);
    }
  })();

  // ============================================================
  //   MENU ROUTES
  // ============================================================

  // GET MENU: Fetches items and categories in one go
  app.get('/api/menu', async (_req, res) => {
    try {
      const items = await storage.getMenuItemsWithCategories();

      const menuData: Record<string, any[]> = {
        breakfast: [],
        lunch: [],
        dinner: []
      };

      items.forEach(item => {
        let catName = item.categoryName ? item.categoryName.toLowerCase() : 'uncategorized';

        // Mapping DB Category names to Frontend Tabs
        if (catName === 'starters') catName = 'breakfast';
        if (catName === 'mains') catName = 'lunch';
        if (catName === 'desserts' || catName === 'drinks') catName = 'dinner';

        if (menuData[catName]) {
          menuData[catName].push(item);
        }
      });

      res.json(menuData);
    } catch (err) {
      console.error("Menu Fetch Error:", err);
      res.json({ breakfast: [], lunch: [], dinner: [] });
    }
  });

  // Get all menu items (for admin panel)
  app.get("/api/menu-items", async (_req, res) => {
    try {
      const items = await storage.getMenuItems();
      res.json(items);
    } catch (err) {
      console.error("Menu Items Fetch Error:", err);
      res.status(500).json({ error: 'Failed to fetch menu items' });
    }
  });

  // Add menu item
  app.post('/api/menu-items', async (req, res) => {
    try {
      const newItem = await storage.createMenuItem({
        categoryId: req.body.categoryId,
        name: req.body.name,
        price: parseInt(req.body.price),
        description: req.body.description || "",
        available: req.body.available !== undefined ? req.body.available : true,
        imageUrl: req.body.imageUrl || ""
      });
      res.json(newItem);
    } catch (err) {
      console.error("Add Item Error:", err);
      res.status(500).json({ error: 'Failed to add item' });
    }
  });

  // Update menu item
  app.patch('/api/menu-items/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateMenuItem(id, req.body);
      res.json(updated);
    } catch (err) {
      console.error("Update Item Error:", err);
      res.status(500).json({ error: 'Update failed' });
    }
  });

  // Delete menu item
  app.delete('/api/menu-items/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMenuItem(id);
      res.json({ message: 'Deleted successfully' });
    } catch (err) {
      console.error("Delete Item Error:", err);
      res.status(500).json({ error: 'Delete failed' });
    }
  });

  // ============================================================
  //   CATEGORY ROUTES
  // ============================================================

  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (err) {
      console.error("Categories Fetch Error:", err);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // ============================================================
  //   RESERVATION ROUTES
  // ============================================================

  app.post("/api/reservations", async (req, res) => {
    // 🔍 DEEP LOGGING FOR PM2
    console.log("================================================");
    console.log("📋 [RESERVATION] Incoming Request");
    console.log("🔐 Session ID:", req.sessionID?.substring(0, 10) + "...");
    console.log("✅ Is Authenticated:", req.isAuthenticated());
    console.log("👤 User from Session:", req.user);
    console.log("================================================");

    try {

      // 2. Parse Body
      const input = insertReservationSchema.parse(req.body);

      // ✅ FIX: REMOVED USERID INJECTION
      // Since you dropped the user_id column from the DB, we cannot save this.
      // (input as any).userId = user.id; <--- DELETED THIS LINE

      // 3. Save to DB
      const reservation = await storage.createReservation(input);

      console.log("🎉 SUCCESS: Reservation created:", reservation.id);
      res.status(201).json(reservation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error("❌ Validation error:", err.errors);
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("❌ DB Error:", err);
      res.status(500).json({ error: "Reservation failed" });
    }
  });

  // GET user's reservations (requires authentication)
  app.get("/api/reservations", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = req.user as any;
      const userReservations = await storage.getReservationsByEmail(user.email);
      res.json(userReservations);
    } catch (err) {
      console.error("Fetch Reservations Error:", err);
      res.status(500).json({ error: "Failed to fetch reservations" });
    }
  });

  return httpServer;
}

// ============================================================
//   DATABASE SEEDING (Outside the main function)
// ============================================================
export async function seedDatabase() {
  const categories = await storage.getCategories();

  if (categories.length === 0) {
    console.log("🌱 Seeding Database...");

    const starters = await storage.createCategory({ name: "Starters", slug: "starters" });
    const mains = await storage.createCategory({ name: "Mains", slug: "mains" });
    const desserts = await storage.createCategory({ name: "Desserts", slug: "desserts" });

    console.log("✅ Categories created");

    try {
      const existingAdmin = await storage.getUserByEmail("admin@lumiere.com");
      if (!existingAdmin) {
        const hashedPassword = await hashPassword("admin123");
        await storage.createUser({
          username: "admin",
          name: "Admin User",
          email: "admin@lumiere.com",
          password: hashedPassword,
          isAdmin: true
        });
        console.log("✅ Admin user created");
      }
    } catch (err) {
      console.error("❌ Error creating admin:", err);
    }

    // Create sample menu items
    await storage.createMenuItem({
      categoryId: starters.id,
      name: "Bruschetta",
      description: "Grilled bread with fresh tomatoes, basil, and olive oil",
      price: 800,
      available: true,
      imageUrl: ""
    });

    await storage.createMenuItem({
      categoryId: starters.id,
      name: "Caesar Salad",
      description: "Crisp romaine lettuce with parmesan and croutons",
      price: 1200,
      available: true,
      imageUrl: ""
    });

    await storage.createMenuItem({
      categoryId: mains.id,
      name: "Grilled Salmon",
      description: "Fresh Atlantic salmon with herbs and lemon butter",
      price: 2400,
      available: true,
      imageUrl: ""
    });

    console.log("✅ Sample menu items created");
  } else {
    console.log("ℹ️  Database already seeded");
  }
}