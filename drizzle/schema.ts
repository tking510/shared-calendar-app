import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tags for categorizing events
 */
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(), // Hex color like #007AFF
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * Shared calendars for group collaboration
 */
export const sharedCalendars = mysqlTable("shared_calendars", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  inviteCode: varchar("inviteCode", { length: 32 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SharedCalendar = typeof sharedCalendars.$inferSelect;
export type InsertSharedCalendar = typeof sharedCalendars.$inferInsert;

/**
 * Members of shared calendars
 */
export const calendarMembers = mysqlTable("calendar_members", {
  id: int("id").autoincrement().primaryKey(),
  calendarId: int("calendarId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "editor", "viewer"]).default("viewer").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type CalendarMember = typeof calendarMembers.$inferSelect;
export type InsertCalendarMember = typeof calendarMembers.$inferInsert;

/**
 * Calendar events
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  calendarId: int("calendarId"), // null means personal calendar
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  allDay: boolean("allDay").default(false).notNull(),
  repeatType: mysqlEnum("repeatType", ["none", "daily", "weekly", "monthly", "yearly"]).default("none").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Event-Tag relationship (many-to-many)
 */
export const eventTags = mysqlTable("event_tags", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  tagId: int("tagId").notNull(),
});

export type EventTag = typeof eventTags.$inferSelect;
export type InsertEventTag = typeof eventTags.$inferInsert;

/**
 * Reminders for events
 */
export const reminders = mysqlTable("reminders", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  minutesBefore: int("minutesBefore").notNull(), // 5, 15, 30, 60, 1440 (1 day)
  notified: boolean("notified").default(false).notNull(),
  notifiedAt: timestamp("notifiedAt"),
});

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;

/**
 * Telegram settings per user
 */
export const telegramSettings = mysqlTable("telegram_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  botToken: varchar("botToken", { length: 100 }),
  chatId: varchar("chatId", { length: 100 }),
  threadId: varchar("threadId", { length: 100 }), // トピックID（スレッドID）
  enabled: boolean("enabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TelegramSetting = typeof telegramSettings.$inferSelect;
export type InsertTelegramSetting = typeof telegramSettings.$inferInsert;

/**
 * People (contacts) for tagging in events
 */
export const people = mysqlTable("people", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Owner of this contact
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }),
  color: varchar("color", { length: 7 }).notNull().default("#6366F1"), // Hex color for display
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;

/**
 * Event-Person relationship (many-to-many)
 */
export const eventPeople = mysqlTable("event_people", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  personId: int("personId").notNull(),
});

export type EventPerson = typeof eventPeople.$inferSelect;
export type InsertEventPerson = typeof eventPeople.$inferInsert;

/**
 * Departments for organization
 */
export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Owner of this department
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).notNull().default("#10B981"), // Hex color for display
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

/**
 * Event-Department relationship (many-to-many)
 */
export const eventDepartments = mysqlTable("event_departments", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  departmentId: int("departmentId").notNull(),
});

export type EventDepartment = typeof eventDepartments.$inferSelect;
export type InsertEventDepartment = typeof eventDepartments.$inferInsert;

/**
 * User's department membership
 */
export const userDepartments = mysqlTable("user_departments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  departmentId: int("departmentId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type UserDepartment = typeof userDepartments.$inferSelect;
export type InsertUserDepartment = typeof userDepartments.$inferInsert;
