import { Request, Response } from "express";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";

// Get session secret from environment or use default (same as SDK)
const SESSION_SECRET = process.env.JWT_SECRET || process.env.COOKIE_SECRET || "manus-calendar-app-secret-key-2024";
const SECRET_KEY = new TextEncoder().encode(SESSION_SECRET);

// Hash password with SHA256
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Generate JWT session token
async function generateSessionToken(userId: number, openId: string, name: string): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = 365 * 24 * 60 * 60 * 1000; // 1 year
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

  return new SignJWT({
    openId,
    appId: process.env.MANUS_APP_ID || "calendar-app",
    name,
    userId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(SECRET_KEY);
}

// Verify JWT session token
async function verifySessionToken(token: string): Promise<{ userId: number; openId: string; name: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ["HS256"],
    });
    
    const { openId, name, userId } = payload as Record<string, unknown>;
    
    if (typeof openId !== "string" || typeof name !== "string") {
      return null;
    }
    
    return {
      userId: typeof userId === "number" ? userId : 0,
      openId,
      name,
    };
  } catch (error) {
    console.error("[SimpleAuth] Token verification failed:", error);
    return null;
  }
}

// Admin credentials
const ADMIN_ID = "admin";
const ADMIN_PASSWORD_HASH = hashPassword("Sloten1234");

// Register a new user
export async function handleRegister(req: Request, res: Response) {
  try {
    const { username, password, name } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "ユーザー名とパスワードは必須です" });
      return;
    }

    if (username.length < 3) {
      res.status(400).json({ error: "ユーザー名は3文字以上必要です" });
      return;
    }

    if (password.length < 4) {
      res.status(400).json({ error: "パスワードは4文字以上必要です" });
      return;
    }

    // Check if username is reserved
    if (username.toLowerCase() === "admin") {
      res.status(400).json({ error: "このユーザー名は使用できません" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "データベースに接続できません" });
      return;
    }

    // Check if user already exists
    const openId = `local_${username.toLowerCase()}`;
    const existing = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    
    if (existing.length > 0) {
      res.status(400).json({ error: "このユーザー名は既に使用されています" });
      return;
    }

    // Create user
    const passwordHash = hashPassword(password);
    const displayName = name || username;
    const result = await db.insert(users).values({
      openId,
      name: displayName,
      email: null,
      loginMethod: `local:${passwordHash}`,
      role: "user",
      lastSignedIn: new Date(),
    });

    const userId = result[0].insertId;

    // Create JWT session token
    const sessionToken = await generateSessionToken(userId, openId, displayName);

    res.json({
      success: true,
      sessionToken,
      user: {
        id: userId,
        openId,
        name: displayName,
        email: null,
        loginMethod: "local",
        lastSignedIn: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[SimpleAuth] Register error:", error);
    res.status(500).json({ error: "登録に失敗しました" });
  }
}

// Login with username/password
export async function handleLogin(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "ユーザー名とパスワードは必須です" });
      return;
    }

    // Check admin login
    if (username.toLowerCase() === "admin") {
      if (hashPassword(password) === ADMIN_PASSWORD_HASH) {
        const db = await getDb();
        let adminUser;
        
        if (db) {
          // Get or create admin user
          const existing = await db.select().from(users).where(eq(users.openId, "local_admin")).limit(1);
          
          if (existing.length > 0) {
            adminUser = existing[0];
            // Update last signed in
            await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, adminUser.id));
          } else {
            // Create admin user
            const result = await db.insert(users).values({
              openId: "local_admin",
              name: "Admin",
              email: null,
              loginMethod: `local:${ADMIN_PASSWORD_HASH}`,
              role: "admin",
              lastSignedIn: new Date(),
            });
            adminUser = {
              id: result[0].insertId,
              openId: "local_admin",
              name: "Admin",
              email: null,
              role: "admin",
              lastSignedIn: new Date(),
            };
          }
        } else {
          // No database, use mock admin
          adminUser = {
            id: 1,
            openId: "local_admin",
            name: "Admin",
            email: null,
            role: "admin",
            lastSignedIn: new Date(),
          };
        }

        const sessionToken = await generateSessionToken(adminUser.id, "local_admin", "Admin");

        res.json({
          success: true,
          sessionToken,
          user: {
            id: adminUser.id,
            openId: "local_admin",
            name: "Admin",
            email: null,
            loginMethod: "local",
            role: "admin",
            lastSignedIn: new Date().toISOString(),
          },
        });
        return;
      } else {
        res.status(401).json({ error: "パスワードが正しくありません" });
        return;
      }
    }

    // Regular user login
    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "データベースに接続できません" });
      return;
    }

    const openId = `local_${username.toLowerCase()}`;
    const userResult = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

    if (userResult.length === 0) {
      res.status(401).json({ error: "ユーザーが見つかりません" });
      return;
    }

    const user = userResult[0];
    const storedPasswordHash = user.loginMethod?.replace("local:", "") || "";

    if (hashPassword(password) !== storedPasswordHash) {
      res.status(401).json({ error: "パスワードが正しくありません" });
      return;
    }

    // Update last signed in
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

    // Create JWT session token
    const sessionToken = await generateSessionToken(user.id, user.openId, user.name || username);

    res.json({
      success: true,
      sessionToken,
      user: {
        id: user.id,
        openId: user.openId,
        name: user.name,
        email: user.email,
        loginMethod: "local",
        role: user.role,
        lastSignedIn: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[SimpleAuth] Login error:", error);
    res.status(500).json({ error: "ログインに失敗しました" });
  }
}

// Get current user from session
export async function handleGetMe(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader?.replace("Bearer ", "") || req.cookies?.session;

    if (!sessionToken) {
      res.status(401).json({ error: "認証が必要です", user: null });
      return;
    }

    const session = await verifySessionToken(sessionToken);
    if (!session) {
      res.status(401).json({ error: "セッションが無効です", user: null });
      return;
    }

    const db = await getDb();
    if (!db) {
      // Return mock user for admin without database
      if (session.openId === "local_admin") {
        res.json({
          user: {
            id: session.userId,
            openId: "local_admin",
            name: "Admin",
            email: null,
            loginMethod: "local",
            role: "admin",
            lastSignedIn: new Date().toISOString(),
          },
        });
        return;
      }
      res.status(500).json({ error: "データベースに接続できません", user: null });
      return;
    }

    const userResult = await db.select().from(users).where(eq(users.openId, session.openId)).limit(1);
    
    if (userResult.length === 0) {
      res.status(401).json({ error: "ユーザーが見つかりません", user: null });
      return;
    }

    const user = userResult[0];
    res.json({
      user: {
        id: user.id,
        openId: user.openId,
        name: user.name,
        email: user.email,
        loginMethod: "local",
        role: user.role,
        lastSignedIn: user.lastSignedIn?.toISOString() || new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[SimpleAuth] GetMe error:", error);
    res.status(500).json({ error: "認証エラー", user: null });
  }
}

// Logout
export async function handleLogout(req: Request, res: Response) {
  // JWT tokens are stateless, so we just return success
  // The client should remove the token from localStorage
  res.json({ success: true });
}

// Validate session and return user ID (for internal use)
export async function validateSession(sessionToken: string): Promise<{ userId: number; openId: string } | null> {
  const session = await verifySessionToken(sessionToken);
  if (!session) {
    return null;
  }
  return { userId: session.userId, openId: session.openId };
}
