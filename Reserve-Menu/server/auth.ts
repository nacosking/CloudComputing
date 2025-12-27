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
  // ✅ 1. Trust Proxy: Critical for AWS Load Balancers
  app.set("trust proxy", 1);

  // ✅ 2. Get environment-specific settings
  const isProduction = process.env.NODE_ENV === "production";
  const sessionSecret = process.env.SESSION_SECRET || "r8q/+&1LM3)Cd*zAGpx1xm{NeQHc;#";

  // Log session configuration for debugging
  console.log("🔐 Session Configuration:");
  console.log("  - Environment:", process.env.NODE_ENV || "development");
  console.log("  - Using custom SESSION_SECRET:", !!process.env.SESSION_SECRET);
  console.log("  - Secure cookies:", isProduction);

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      // ✅ Secure only in production with HTTPS
      secure: isProduction,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      // ✅ Changed to 'none' for cross-origin or 'lax' for same-origin
      sameSite: isProduction ? "none" : "lax",
      // ✅ Add domain for production if needed
      domain: process.env.COOKIE_DOMAIN || undefined,
    },
    // ✅ Add name to avoid conflicts
    name: "lumiere.sid",
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // ✅ Debug middleware to log session info
  app.use((req, res, next) => {
    console.log("📍 Request:", req.method, req.path);
    console.log("  - Session ID:", req.sessionID);
    console.log("  - Authenticated:", req.isAuthenticated());
    console.log("  - User:", req.user ? (req.user as any).email : "none");
    next();
  });

  // ✅ 3. Configure Strategy to look for 'email' instead of 'username'
  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        console.log("🔍 Login attempt for:", email);
        const user = await storage.getUserByEmail(email);

        if (!user) {
          console.log("❌ User not found:", email);
          return done(null, false, { message: "Invalid credentials" });
        }

        const passwordMatch = await comparePasswords(password, user.password);
        if (!passwordMatch) {
          console.log("❌ Password mismatch for:", email);
          return done(null, false, { message: "Invalid credentials" });
        }

        console.log("✅ Login successful for:", email);
        return done(null, user);
      } catch (err) {
        console.error("❌ Login error:", err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log("💾 Serializing user:", (user as any).id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("🔓 Deserializing user:", id);
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
  //   AUTH ROUTES
  // ============================================================

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("📝 Registration attempt:", req.body.email);

      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        console.log("❌ Email already exists:", req.body.email);
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        isAdmin: req.body.email === "admin@lumiere.com",
      });

      console.log("✅ User created:", user.email);

      req.login(user, (err) => {
        if (err) {
          console.error("❌ Login after registration failed:", err);
          return next(err);
        }
        const { password: _, ...safeUser } = user;
        console.log("✅ User logged in after registration");
        res.status(201).json(safeUser);
      });
    } catch (err) {
      console.error("❌ Registration error:", err);
      next(err);
    }
  });

  // ✅ 4. Login Route with better logging
  app.post("/api/login", (req, res, next) => {
    console.log("🔐 Login request received for:", req.body.email);

    passport.authenticate("local", (err: any, user: SelectUser, info: any) => {
      if (err) {
        console.error("❌ Authentication error:", err);
        return next(err);
      }

      if (!user) {
        console.log("❌ Authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("❌ Session creation failed:", err);
          return next(err);
        }

        const { password: _, ...safeUser } = user;
        console.log("✅ Login successful, session created");
        console.log("   Session ID:", req.sessionID);
        res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const userEmail = req.user ? (req.user as any).email : "unknown";
    console.log("👋 Logout request for:", userEmail);

    req.logout((err) => {
      if (err) {
        console.error("❌ Logout error:", err);
        return next(err);
      }
      console.log("✅ User logged out successfully");
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("👤 User check - Authenticated:", req.isAuthenticated());

    if (!req.isAuthenticated()) {
      console.log("❌ User not authenticated");
      return res.sendStatus(401);
    }

    const { password: _, ...safeUser } = req.user as SelectUser;
    console.log("✅ User authenticated:", safeUser.email);
    res.json(safeUser);
  });
}