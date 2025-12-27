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
  // ✅ CRITICAL: Trust proxy for AWS ALB
  app.set("trust proxy", 1);

  const sessionSecret = process.env.SESSION_SECRET || "r8q/+&1LM3)Cd*zAGpx1xm{NeQHc;#";

  console.log("🔐 Session Configuration:");
  console.log("  - Session secret configured:", !!process.env.SESSION_SECRET);
  console.log("  - Trust proxy: 1");

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    // ✅ CHANGE THIS NAME to something new to bypass old stuck cookies
    name: "lumiere_session_v2",
    cookie: {
      // ✅ Keep secure FALSE for HTTP/AWS ALB
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      path: "/",
    },
    proxy: true,
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // ✅ Debug middleware
  app.use((req, res, next) => {
    console.log(`📍 ${req.method} ${req.path}`);
    console.log(`  SessionID: ${req.sessionID}`);
    console.log(`  Cookie header: ${req.headers.cookie || 'NONE'}`);
    console.log(`  Auth: ${req.isAuthenticated()}`);
    if (req.user) console.log(`  User: ${(req.user as any).email}`);
    next();
  });

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        console.log("🔍 Login attempt:", email);
        const user = await storage.getUserByEmail(email);

        if (!user) {
          console.log("❌ User not found");
          return done(null, false, { message: "Invalid credentials" });
        }

        const passwordMatch = await comparePasswords(password, user.password);
        if (!passwordMatch) {
          console.log("❌ Password mismatch");
          return done(null, false, { message: "Invalid credentials" });
        }

        console.log("✅ Credentials valid");
        return done(null, user);
      } catch (err) {
        console.error("❌ Login error:", err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log("💾 Serialize:", (user as any).id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("🔓 Deserialize:", id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log("❌ User not found");
        return done(null, false);
      }
      console.log("✅ User found:", user.email);
      done(null, user);
    } catch (err) {
      console.error("❌ Deserialize error:", err);
      done(err);
    }
  });

  // ============================================================
  //   AUTH ROUTES
  // ============================================================

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("📝 Register:", req.body.email);

      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        console.log("❌ Email exists");
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        isAdmin: req.body.email === "admin@lumiere.com",
      });

      console.log("✅ User created");

      req.login(user, (err) => {
        if (err) {
          console.error("❌ Login failed:", err);
          return next(err);
        }

        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("❌ Session save error:", saveErr);
            return next(saveErr);
          }

          const { password: _, ...safeUser } = user;
          console.log("✅ Registered, SessionID:", req.sessionID);
          console.log("✅ Cookie will be: lumiere.sid");
          res.status(201).json(safeUser);
        });
      });
    } catch (err) {
      console.error("❌ Registration error:", err);
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("🔐 Login request:", req.body.email);
    console.log("   Incoming cookies:", req.headers.cookie);

    passport.authenticate("local", (err: any, user: SelectUser, info: any) => {
      if (err) {
        console.error("❌ Auth error:", err);
        return next(err);
      }

      if (!user) {
        console.log("❌ Auth failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("❌ Session create failed:", err);
          return next(err);
        }

        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("❌ Session save error:", saveErr);
            return next(saveErr);
          }

          const { password: _, ...safeUser } = user;
          console.log("✅ Login success!");
          console.log("   SessionID:", req.sessionID);
          console.log("   User:", safeUser.email);
          console.log("   Set-Cookie header:", res.getHeader('Set-Cookie'));
          res.json(safeUser);
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const userEmail = req.user ? (req.user as any).email : "unknown";
    console.log("👋 Logout:", userEmail);

    req.logout((err) => {
      if (err) {
        console.error("❌ Logout error:", err);
        return next(err);
      }

      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("❌ Session destroy error:", destroyErr);
        }
        res.clearCookie("lumiere.sid");
        console.log("✅ Logged out");
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("👤 User check");
    console.log("   SessionID:", req.sessionID);
    console.log("   Cookie:", req.headers.cookie);
    console.log("   Authenticated:", req.isAuthenticated());

    if (!req.isAuthenticated()) {
      console.log("❌ Not authenticated");
      return res.sendStatus(401);
    }

    const { password: _, ...safeUser } = req.user as SelectUser;
    console.log("✅ User:", safeUser.email);
    res.json(safeUser);
  });
}