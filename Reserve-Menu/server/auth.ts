import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // ✅ CRITICAL: Set trust proxy BEFORE setting up sessions
  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "r8q/+&1LM3)Cd*zAGpx1xm{NeQHc;#",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      // ✅ FIXED: Only use secure cookies in production with HTTPS
      secure: app.get("env") === "production" && process.env.USE_HTTPS === "true",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: app.get("env") === "production" ? "lax" : "lax", // ✅ FIXED: Changed from 'strict'
    }
  };

  console.log("🔐 Session config:", {
    env: app.get("env"),
    secure: sessionSettings.cookie?.secure,
    sameSite: sessionSettings.cookie?.sameSite,
    trustProxy: app.get("trust proxy")
  });

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // ✅ ADDED: Middleware to log session status
  app.use((req, res, next) => {
    console.log("📋 Session check:", {
      path: req.path,
      sessionID: req.sessionID?.substring(0, 8) + "...",
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id || null
    });
    next();
  });

  // Configure Passport Local Strategy - Login with USERNAME (not email)
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid credentials" });
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log("✅ Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      console.log("✅ Deserializing user:", user?.id || "not found");
      done(null, user);
    } catch (err) {
      console.error("❌ Deserialize error:", err);
      done(err);
    }
  });

  // ============================================================
  //   AUTHENTICATION ROUTES
  // ============================================================

  // Register endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(req.body.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(req.body.password);

      // Create user with admin check
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        isAdmin: req.body.email === "admin@lumiere.com",
      });

      // Auto-login after registration
      req.login(user, (err) => {
        if (err) {
          console.error("❌ Login after register failed:", err);
          return next(err);
        }
        console.log("✅ User registered and logged in:", user.id);
        // Return user without password
        const { password: _, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (err) {
      console.error("❌ Register error:", err);
      next(err);
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res, next) => {
    try {
      // Try to find user by email first, then use their username for passport
      const user = await storage.getUserByEmail(req.body.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Now authenticate with the username
      passport.authenticate("local", (err: any, authenticatedUser: any, info: any) => {
        if (err) {
          console.error("❌ Auth error:", err);
          return next(err);
        }
        if (!authenticatedUser) {
          console.log("❌ Authentication failed:", info?.message);
          return res.status(401).json({ message: info?.message || "Invalid credentials" });
        }

        req.login(authenticatedUser, (err) => {
          if (err) {
            console.error("❌ Login error:", err);
            return next(err);
          }
          console.log("✅ User logged in successfully:", authenticatedUser.id);
          console.log("✅ Session ID:", req.sessionID?.substring(0, 8) + "...");
          // Return user without password
          const { password: _, ...safeUser } = authenticatedUser;
          res.status(200).json(safeUser);
        });
      })({ body: { username: user.username, password: req.body.password } }, res, next);
    } catch (err) {
      console.error("❌ Login route error:", err);
      next(err);
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    req.logout((err) => {
      if (err) {
        console.error("❌ Logout error:", err);
        return next(err);
      }
      console.log("✅ User logged out:", userId);
      res.sendStatus(200);
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    console.log("🔍 Checking user auth:", {
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id || null,
      sessionID: req.sessionID?.substring(0, 8) + "..."
    });

    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    // Return user without password
    const { password: _, ...safeUser } = req.user as SelectUser;
    res.json(safeUser);
  });
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
}

// Middleware to check if user is admin
export function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Admin access required" });
}