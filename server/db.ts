import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  tags,
  InsertTag,
  events,
  InsertEvent,
  eventTags,
  InsertEventTag,
  reminders,
  InsertReminder,
  sharedCalendars,
  InsertSharedCalendar,
  calendarMembers,
  InsertCalendarMember,
  telegramSettings,
  InsertTelegramSetting,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ User Functions ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Tag Functions ============
export async function getUserTags(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tags).where(eq(tags.userId, userId));
}

export async function createTag(data: InsertTag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tags).values(data);
  return result[0].insertId;
}

export async function updateTag(id: number, userId: number, data: Partial<InsertTag>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tags).set(data).where(and(eq(tags.id, id), eq(tags.userId, userId)));
}

export async function deleteTag(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)));
}

// ============ Event Functions ============
export async function getUserEvents(userId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(events.userId, userId)];
  if (startDate) conditions.push(gte(events.startTime, startDate));
  if (endDate) conditions.push(lte(events.endTime, endDate));

  return db.select().from(events).where(and(...conditions));
}

export async function getEventById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(events).values(data);
  return result[0].insertId;
}

export async function updateEvent(id: number, userId: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(events).set(data).where(and(eq(events.id, id), eq(events.userId, userId)));
}

export async function deleteEvent(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete related event tags and reminders first
  await db.delete(eventTags).where(eq(eventTags.eventId, id));
  await db.delete(reminders).where(eq(reminders.eventId, id));
  await db.delete(events).where(and(eq(events.id, id), eq(events.userId, userId)));
}

// ============ Event Tags Functions ============
export async function getEventTags(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ tag: tags })
    .from(eventTags)
    .innerJoin(tags, eq(eventTags.tagId, tags.id))
    .where(eq(eventTags.eventId, eventId));
  return result.map((r) => r.tag);
}

export async function setEventTags(eventId: number, tagIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Remove existing tags
  await db.delete(eventTags).where(eq(eventTags.eventId, eventId));
  // Add new tags
  if (tagIds.length > 0) {
    await db.insert(eventTags).values(tagIds.map((tagId) => ({ eventId, tagId })));
  }
}

// ============ Reminder Functions ============
export async function getEventReminders(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reminders).where(eq(reminders.eventId, eventId));
}

export async function createReminder(data: InsertReminder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reminders).values(data);
  return result[0].insertId;
}

export async function deleteEventReminders(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reminders).where(eq(reminders.eventId, eventId));
}

export async function getPendingReminders() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  // Get all events with pending reminders
  const result = await db
    .select({
      reminder: reminders,
      event: events,
    })
    .from(reminders)
    .innerJoin(events, eq(reminders.eventId, events.id))
    .where(eq(reminders.notified, false));

  // Filter reminders that should be sent now
  return result.filter(({ reminder, event }) => {
    const notifyTime = new Date(event.startTime.getTime() - reminder.minutesBefore * 60 * 1000);
    return notifyTime <= now;
  });
}

export async function markReminderNotified(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reminders).set({ notified: true, notifiedAt: new Date() }).where(eq(reminders.id, id));
}

// ============ Shared Calendar Functions ============
export async function getUserSharedCalendars(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const memberCalendars = await db
    .select({ calendar: sharedCalendars, role: calendarMembers.role })
    .from(calendarMembers)
    .innerJoin(sharedCalendars, eq(calendarMembers.calendarId, sharedCalendars.id))
    .where(eq(calendarMembers.userId, userId));
  return memberCalendars;
}

export async function createSharedCalendar(data: InsertSharedCalendar) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sharedCalendars).values(data);
  const calendarId = result[0].insertId;
  // Add owner as member
  await db.insert(calendarMembers).values({
    calendarId,
    userId: data.ownerId,
    role: "owner",
  });
  return calendarId;
}

export async function getSharedCalendarByInviteCode(inviteCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sharedCalendars).where(eq(sharedCalendars.inviteCode, inviteCode)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function joinSharedCalendar(calendarId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if already a member
  const existing = await db
    .select()
    .from(calendarMembers)
    .where(and(eq(calendarMembers.calendarId, calendarId), eq(calendarMembers.userId, userId)))
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(calendarMembers).values({ calendarId, userId, role: "editor" });
}

export async function getSharedCalendarEvents(calendarId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(events.calendarId, calendarId)];
  if (startDate) conditions.push(gte(events.startTime, startDate));
  if (endDate) conditions.push(lte(events.endTime, endDate));
  return db.select().from(events).where(and(...conditions));
}

export async function getCalendarMembers(calendarId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ user: users, role: calendarMembers.role })
    .from(calendarMembers)
    .innerJoin(users, eq(calendarMembers.userId, users.id))
    .where(eq(calendarMembers.calendarId, calendarId));
  return result;
}

// ============ Telegram Settings Functions ============
export async function getTelegramSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(telegramSettings).where(eq(telegramSettings.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertTelegramSettings(userId: number, data: Partial<InsertTelegramSetting>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getTelegramSettings(userId);
  if (existing) {
    await db.update(telegramSettings).set(data).where(eq(telegramSettings.userId, userId));
  } else {
    await db.insert(telegramSettings).values({ userId, ...data });
  }
}

export async function sendTelegramMessage(userId: number, message: string) {
  const settings = await getTelegramSettings(userId);
  if (!settings || !settings.enabled || !settings.botToken || !settings.chatId) {
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: settings.chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("[Telegram] Failed to send message:", error);
    return false;
  }
}
