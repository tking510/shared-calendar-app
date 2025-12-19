import { Request, Response } from "express";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Simple in-memory session store (for production, use Redis or database)
const sessions = new Map<string, { userId: number; openId: string; expiresAt: Date }>();

// Hash password with SHA256
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Generate session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
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
    const result = await db.insert(users).values({
      openId,
      name: name || username,
      email: null,
      loginMethod: `local:${passwordHash}`,
      role: "user",
      lastSignedIn: new Date(),
    });

    const userId = result[0].insertId;

    // Create session
    const sessionToken = generateSessionToken();
    sessions.set(sessionToken, {
      userId,
      openId,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    });

    res.json({
      success: true,
      sessionToken,
      user: {
        id: userId,
        openId,
        name: name || username,
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

        const sessionToken = generateSessionToken();
        sessions.set(sessionToken, {
          userId: adminUser.id,
          openId: "local_admin",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });

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

    // Create session
    const sessionToken = generateSessionToken();
    sessions.set(sessionToken, {
      userId: user.id,
      openId: user.openId,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

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

    const session = sessions.get(sessionToken);
    if (!session || session.expiresAt < new Date()) {
      sessions.delete(sessionToken);
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

    const userResult = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    
    if (userResult.length === 0) {
      sessions.delete(sessionToken);
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
  const authHeader = req.headers.authorization;
  const sessionToken = authHeader?.replace("Bearer ", "") || req.cookies?.session;
  
  if (sessionToken) {
    sessions.delete(sessionToken);
  }
  
  res.json({ success: true });
}

// Validate session and return user ID (for internal use)
export async function validateSession(sessionToken: string): Promise<{ userId: number; openId: string } | null> {
  const session = sessions.get(sessionToken);
  if (!session || session.expiresAt < new Date()) {
    if (session) sessions.delete(sessionToken);
    return null;
  }
  return { userId: session.userId, openId: session.openId };
}
