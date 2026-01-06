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
  friends,
  InsertFriend,
  eventFriends,
  departments,
  InsertDepartment,
  eventDepartments,
  userDepartments,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (!_db && dbUrl) {
    try {
      _db = drizzle(dbUrl);
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

export async function updateUserTelegramChatId(userId: number, telegramChatId: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ telegramChatId }).where(eq(users.id, userId));
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
  
  // 現在時刻をマレーシア時間（GMT+8）として取得
  // DBにはローカル時間（マレーシア時間）がそのまま保存されている
  // 例: 16:00マレーシア時間 → DBには "2024-12-24T16:00:00" として保存
  // これをJavaScriptのDateで読み込むとUTCとして解釈される
  
  const now = new Date();
  // UTC時刻に8時間を加算してマレーシア時間を取得
  const malaysiaOffset = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  const nowMalaysiaTime = now.getTime() + malaysiaOffset;
  
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
    // event.startTimeはDBから取得した時刻
    // DBにはマレーシア時間がそのまま保存されているが、JavaScriptはUTCとして解釈
    // 例: DBの "16:00" → JavaScriptでは UTC 16:00 として解釈
    // 現在時刻もUTCとして比較するため、マレーシア時間をUTCの数値として比較
    const eventStartMs = event.startTime.getTime();
    const notifyTimeMs = eventStartMs - reminder.minutesBefore * 60 * 1000;
    // 現在のマレーシア時間を同じ形式で比較
    // nowMalaysiaTimeはUTC + 8hのミリ秒値
    // DBの時刻はUTCとして解釈されるので、比較のために調整
    // 例: DBに16:00が保存 → eventStartMs = UTC 16:00のミリ秒
    // 現在マレーシア時間が16:00なら → nowMalaysiaTime = UTC 08:00 + 8h = UTC 16:00のミリ秒
    // つまり、nowMalaysiaTimeをそのまま比較すればOK
    // しかし、nowMalaysiaTimeはnow.getTime() + 8hなので、UTCとしては8時間先の時刻
    // DBの時刻はUTCとして解釈されるので、そのまま比較すればいい
    // 実際: now.getTime()がUTC 08:00なら、nowMalaysiaTimeはUTC 16:00のミリ秒値
    // DBの16:00はUTC 16:00として解釈されるので、一致する
    return notifyTimeMs <= nowMalaysiaTime;
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

export async function sendTelegramMessage(userId: number, message: string, overrideChatId?: string) {
  const settings = await getTelegramSettings(userId);
  if (!settings || !settings.enabled || !settings.botToken) {
    return false;
  }
  
  // Use override chatId if provided (for sending to friends), otherwise use user's chatId
  const targetChatId = overrideChatId || settings.chatId;
  if (!targetChatId) {
    return false;
  }

  try {
    const payload: Record<string, string | number> = {
      chat_id: targetChatId,
      text: message,
      parse_mode: "HTML",
    };
    
    // スレッドID（トピックID）が設定されている場合は追加（オーバーライドしていない場合のみ）
    if (settings.threadId && !overrideChatId) {
      payload.message_thread_id = parseInt(settings.threadId, 10);
    }
    
    const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error("[Telegram] Failed to send message:", error);
    return false;
  }
}

// ============ Friends Functions ============
export async function getUserFriends(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(friends).where(eq(friends.userId, userId));
}

export async function createFriend(data: InsertFriend) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(friends).values(data);
  return result[0].insertId;
}

export async function updateFriend(id: number, userId: number, data: Partial<InsertFriend>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(friends).set(data).where(and(eq(friends.id, id), eq(friends.userId, userId)));
}

export async function deleteFriend(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete related event_friends first
  await db.delete(eventFriends).where(eq(eventFriends.friendId, id));
  await db.delete(friends).where(and(eq(friends.id, id), eq(friends.userId, userId)));
}

// Find friend by Telegram Chat ID
export async function findFriendByTelegramChatId(telegramChatId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(friends).where(eq(friends.telegramChatId, telegramChatId));
  return result[0] ?? null;
}

// Register friend from Telegram
export async function registerFriendFromTelegram(data: {
  userId: number;
  name: string;
  telegramChatId: string;
  telegramUsername: string | null;
  color: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if already registered
  const existing = await db.select().from(friends)
    .where(and(
      eq(friends.userId, data.userId),
      eq(friends.telegramChatId, data.telegramChatId)
    ));
  
  if (existing.length > 0) {
    return { id: existing[0].id, isNew: false };
  }
  
  const result = await db.insert(friends).values({
    userId: data.userId,
    name: data.name,
    telegramChatId: data.telegramChatId,
    telegramUsername: data.telegramUsername,
    color: data.color,
  });
  
  return { id: result[0].insertId, isNew: true };
}



export async function getEventFriends(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ friend: friends })
    .from(eventFriends)
    .innerJoin(friends, eq(eventFriends.friendId, friends.id))
    .where(eq(eventFriends.eventId, eventId));
  return result.map((r) => r.friend);
}

export async function setEventFriends(eventId: number, friendIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(eventFriends).where(eq(eventFriends.eventId, eventId));
  if (friendIds.length > 0) {
    await db.insert(eventFriends).values(friendIds.map((friendId) => ({ eventId, friendId })));
  }
}

export async function getFriendById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(friends).where(eq(friends.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Department Functions (Admin Only for CRUD) ============
export async function getAllDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments);
}

export async function createDepartment(data: { name: string; color?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(departments).values(data);
  return result[0].insertId;
}

export async function updateDepartment(id: number, data: { name?: string; color?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(departments).set(data).where(eq(departments.id, id));
}

export async function deleteDepartment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete related event_departments and user_departments first
  await db.delete(eventDepartments).where(eq(eventDepartments.departmentId, id));
  await db.delete(userDepartments).where(eq(userDepartments.departmentId, id));
  await db.delete(departments).where(eq(departments.id, id));
}

export async function getEventDepartments(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ department: departments })
    .from(eventDepartments)
    .innerJoin(departments, eq(eventDepartments.departmentId, departments.id))
    .where(eq(eventDepartments.eventId, eventId));
  return result.map((r) => r.department);
}

export async function setEventDepartments(eventId: number, departmentIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(eventDepartments).where(eq(eventDepartments.eventId, eventId));
  if (departmentIds.length > 0) {
    await db.insert(eventDepartments).values(departmentIds.map((departmentId) => ({ eventId, departmentId })));
  }
}

export async function getUserDepartmentMemberships(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ department: departments })
    .from(userDepartments)
    .innerJoin(departments, eq(userDepartments.departmentId, departments.id))
    .where(eq(userDepartments.userId, userId));
  return result.map((r) => r.department);
}

export async function setUserDepartments(userId: number, departmentIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(userDepartments).where(eq(userDepartments.userId, userId));
  if (departmentIds.length > 0) {
    await db.insert(userDepartments).values(departmentIds.map((departmentId) => ({ userId, departmentId })));
  }
}
