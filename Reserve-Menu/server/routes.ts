import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertReservationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // 1. Setup Authentication
  setupAuth(app);

  // 2. Automated Startup: Seed the database if empty
  // This ensures data is always there on the first visit
  (async () => {
    try {
      await seedDatabase();
    } catch (e) {
      console.error("Startup Seed Error:", e);
    }
  })();

  // ============================================================
  //   DYNAMIC MENU ROUTES (Using Unified Storage)
  // ============================================================

  // GET MENU: Fetches items and categories in one go
  app.get('/api/menu', async (_req, res) => {
    try {
      const items = await storage.getMenuItemsWithCategories();

      const menuData: Record<string, any[]> = { breakfast: [], lunch: [], dinner: [] };
      
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

  // ADD ITEM: Uses storage method instead of raw SQL
  app.post('/api/menu', async (req, res) => {
    try {
      // First, we find the category ID based on the name sent from frontend
      const cats = await storage.getCategories();
      const category = cats.find(c => 
        c.slug === req.body.category.toLowerCase() || 
        c.name === req.body.category
      );

      if (!category) {
        return res.status(400).json({ error: "Invalid category" });
      }

      const newItem = await storage.createMenuItem({
        categoryId: category.id,
        name: req.body.name,
        price: parseInt(req.body.price),
        description: req.body.description,
        available: true
      });

      res.json(newItem);
    } catch (err) {
      console.error("Add Item Error:", err);
      res.status(500).json({ error: 'Failed to add item' });
    }
  });

  // UPDATE ITEM
  app.put('/api/menu/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateMenuItem(id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Update failed' });
    }
  });

  // DELETE ITEM
  app.delete('/api/menu/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMenuItem(id);
      res.json({ message: 'Deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Delete failed' });
    }
  });

  // ============================================================
  //   RESERVATIONS & CATEGORIES
  // ============================================================

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
      res.status(500).json({ error: "Reservation failed" });
    }
  });

  app.get("/api/categories", async (_req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  return httpServer;
}

// Optimized Seed Function
export async function seedDatabase() {
  const categories = await storage.getCategories();
  if (categories.length === 0) {
    console.log("Seeding Database...");
    const starters = await storage.createCategory({ name: "Starters", slug: "starters" });
    const mains = await storage.createCategory({ name: "Mains", slug: "mains" });
    const desserts = await storage.createCategory({ name: "Desserts", slug: "desserts" });

    await storage.createMenuItem({ 
      categoryId: starters.id, 
      name: "Bruschetta", 
      description: "Grilled bread with tomatoes and basil", 
      price: 800, 
      available: true 
    });
    
    await storage.createMenuItem({ 
      categoryId: mains.id, 
      name: "Grilled Salmon", 
      description: "Fresh atlantic salmon with herbs", 
      price: 2400, 
      available: true 
    });
    
    console.log("Seed completed!");
  }
}