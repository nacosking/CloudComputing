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

  // 1. Setup Session Auth (Passport.js) - This also registers the auth routes
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
  app.get('/api/menu', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM menu_items ORDER BY id ASC');
      // Format for frontend tabs
      const menuData: Record<string, any[]> = { breakfast: [], lunch: [], dinner: [] };
      result.rows.forEach(item => {
        if (!menuData[item.category]) menuData[item.category] = [];
        menuData[item.category].push({
          ...item,
          price: `$${(item.price / 100).toFixed(2)}` // ✅ Convert cents to dollars
        });
      });
      res.json(menuData);
    } catch (err) {
      console.error("DB Error:", err);
      // Fallback to empty if DB fails, so app doesn't crash
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

  // ✅ Mark reservation as paid
  app.patch("/api/reservations/:id/pay", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { qrUrl } = req.body;
      const updatedReservation = await storage.markReservationPaid(id, qrUrl);
      res.json(updatedReservation);
    } catch (err) {
      console.error("Payment Update Error:", err);
      res.status(500).json({ error: "Failed to update payment status" });
    }
  });

  // ✅ CREATE RESERVATION
  app.post("/api/reservations", async (req, res) => {
    try {
      // 1. Require authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Must be logged in to make a reservation" });
      }

      const user = req.user as any;
      console.log("🎫 Creating reservation for user:", user.id, user.email);

      // 2. Parse the incoming form data
      const input = insertReservationSchema.parse(req.body);

      // 3. Create reservation with BOTH userId AND email
      const reservation = await storage.createReservation({
        ...input,
        userId: user.id,
        email: input.email || user.email // Use form email or fallback to user's email
      });

      console.log("✅ Reservation created:", reservation.id, "for user:", user.id);
      res.status(201).json(reservation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Reservation Error:", err);
      res.status(500).json({ error: "Reservation failed" });
    }
  });

  // ✅ GET RESERVATIONS (FIXED TO ALWAYS FETCH BY BOTH userId AND email)
  app.get("/api/reservations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = req.user as any;
      console.log("🔍 Fetching reservations for user:", {
        userId: user.id,
        email: user.email,
        isAdmin: user.isAdmin
      });

      if (user.isAdmin) {
        // Admin sees all reservations
        const reservations = await storage.getReservations();
        console.log("👑 Admin fetched", reservations.length, "reservations");
        res.json(reservations);
      } else {
        // ✅ CRITICAL FIX: Fetch by BOTH userId AND email
        const reservations = await storage.getReservationsByUserIdOrEmail(user.id, user.email);
        console.log("📋 User fetched", reservations.length, "reservations");

        // Debug: Log the reservation IDs and which field matched
        reservations.forEach(r => {
          console.log(`  - Reservation ${r.id}: userId=${r.userId}, email=${r.email}`);
        });

        res.json(reservations);
      }
    } catch (err) {
      console.error("Get Reservations Error:", err);
      res.status(500).json({ error: "Failed to fetch reservations" });
    }
  });

  return httpServer;
}

// ============================================================
//   DATABASE SEEDING
// ============================================================
export async function seedDatabase() {
  const categories = await storage.getCategories();

  if (categories.length === 0) {
    console.log("🌱 Seeding Database...");

    // Create categories
    const starters = await storage.createCategory({
      name: "Starters",
      slug: "starters"
    });
    const mains = await storage.createCategory({
      name: "Mains",
      slug: "mains"
    });
    const desserts = await storage.createCategory({
      name: "Desserts",
      slug: "desserts"
    });

    console.log("✅ Categories created");

    // Create default admin user
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
        console.log("   📧 Email: admin@lumiere.com");
        console.log("   🔑 Password: admin123");
      } else {
        console.log("ℹ️  Admin user already exists");
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

    await storage.createMenuItem({
      categoryId: mains.id,
      name: "Beef Tenderloin",
      description: "Premium beef with roasted vegetables",
      price: 3200,
      available: true,
      imageUrl: ""
    });

    await storage.createMenuItem({
      categoryId: desserts.id,
      name: "Tiramisu",
      description: "Classic Italian coffee-flavored dessert",
      price: 900,
      available: true,
      imageUrl: ""
    });

    await storage.createMenuItem({
      categoryId: desserts.id,
      name: "Chocolate Lava Cake",
      description: "Warm chocolate cake with molten center",
      price: 1100,
      available: true,
      imageUrl: ""
    });

    console.log("✅ Sample menu items created");
    console.log("🎉 Database seed completed!");
  } else {
    console.log("ℹ️  Database already seeded");
  }
}