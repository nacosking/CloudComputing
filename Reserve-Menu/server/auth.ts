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
  app.set("trust proxy", 1);

  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "r8q/+&1LM3)Cd*zAGpx1xm{NeQHc;#",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: THIRTY_DAYS,
      sameSite: "lax",
    },
    name: "lumiere.sid"
  };

  console.log("🔐 Session config loaded:", {
    env: app.get("env"),
    secure: sessionSettings.cookie?.secure,
    maxAgeDays: (sessionSettings.cookie?.maxAge || 0) / (24 * 60 * 60 * 1000),
    trustProxy: app.get("trust proxy")
  });

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`📋 ${req.method} ${req.path} - Auth: ${req.isAuthenticated()} - User: ${req.user?.id || 'none'}`);
    }
    next();
  });

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password"
      },
      async (email, password, done) => {
        try {
          console.log("🔐 Login attempt for email:", email);
          
          const user = await storage.getUserByEmail(email);

          if (!user) {
            console.log("❌ User not found:", email);
            return done(null, false, { message: "Invalid credentials" });
          }

          console.log("🔍 Found user:", user.email, "Checking password...");
          
          const isValidPassword = await comparePasswords(password, user.password);
          if (!isValidPassword) {
            console.log("❌ Invalid password for:", email);
            return done(null, false, { message: "Invalid credentials" });
          }

          console.log("✅ Password valid! Login successful for:", user.email, "userId:", user.id);
          return done(null, user);
        } catch (err) {
          console.error("❌ Login error:", err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log("💾 Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("🔍 Deserializing user:", id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log("❌ User not found during deserialization:", id);
        return done(null, false);
      }
      console.log("✅ User deserialized:", user.email);
      done(null, user);
    } catch (err) {
      console.error("❌ Deserialization error:", err);
      done(err);
    }
  });

  // ============================================================
  //   AUTHENTICATION ROUTES
  // ============================================================

  // Register endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("📝 Registration attempt:", req.body.email);

      const existingUsername = await storage.getUserByUsername(req.body.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);

      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        isAdmin: req.body.email === "admin@lumiere.com",
      });

      console.log("✅ User registered:", user.email, "userId:", user.id);

      // 🔥 FIX: Double-save to ensure session persists to database
      req.login(user, (err) => {
        if (err) {
          console.error("❌ Auto-login error:", err);
          return next(err);
        }
        
        // Force an explicit save AFTER req.login completes
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("❌ Session save error:", saveErr);
            return next(saveErr);
          }
          
          // Wait a tick to ensure DB write completes
          setImmediate(() => {
            console.log("✅ Auto-login successful for:", user.email, "Session:", req.sessionID);
            const { password: _, ...safeUser } = user;
            res.status(201).json(safeUser);
          });
        });
      });
    } catch (err) {
      console.error("❌ Registration error:", err);
      next(err);
    }
  });

  // 🔥 FIX: Login endpoint with guaranteed session persistence
  app.post("/api/login", (req, res, next) => {
    console.log("🔐 Login request for:", req.body.email);

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("❌ Authentication error:", err);
        return next(err);
      }

      if (!user) {
        console.log("❌ Authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("❌ Session creation error:", loginErr);
          return next(loginErr);
        }

        // Double-save: req.login saves internally, then we force another save
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("❌ Session save error:", saveErr);
            return next(saveErr);
          }

          // Use setImmediate to ensure the save completes before response
          setImmediate(() => {
            console.log("✅ Login successful:", user.email, "Session ID:", req.sessionID);
            const { password: _, ...safeUser } = user;
            res.status(200).json(safeUser);
          });
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    const userEmail = req.user?.email || "unknown";
    console.log("👋 Logout request from:", userEmail);

    req.logout((err) => {
      if (err) {
        console.error("❌ Logout error:", err);
        return next(err);
      }

      req.session.destroy((err) => {
        if (err) {
          console.error("❌ Session destroy error:", err);
        }
        res.clearCookie("lumiere.sid");
        console.log("✅ Logout successful");
        res.sendStatus(200);
      });
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    console.log("👤 User check - Auth:", req.isAuthenticated(), "User:", req.user?.id || "none");

    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
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