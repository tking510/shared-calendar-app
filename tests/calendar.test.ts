import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock date utilities
const formatDate = (d: Date) => {
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
};

const formatTime = (d: Date) => {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

// Calendar day generation logic
function generateCalendarDays(currentDate: Date) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay();

  const days: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = [];
  const today = new Date();

  // Days from previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Days in current month
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    days.push({
      date,
      isCurrentMonth: true,
      isToday,
    });
  }

  // Days from next month to fill the grid
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
      isToday: false,
    });
  }

  return days;
}

// Reminder time calculation
function calculateReminderTime(eventTime: Date, minutesBefore: number): Date {
  return new Date(eventTime.getTime() - minutesBefore * 60 * 1000);
}

// Check if reminder should be sent
function shouldSendReminder(reminderTime: Date, now: Date): boolean {
  return reminderTime <= now;
}

describe("Calendar Utilities", () => {
  describe("formatDate", () => {
    it("should format date correctly", () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatDate(date)).toBe("2024/01/15");
    });

    it("should pad single digit months and days", () => {
      const date = new Date(2024, 5, 5); // June 5, 2024
      expect(formatDate(date)).toBe("2024/06/05");
    });
  });

  describe("formatTime", () => {
    it("should format time correctly", () => {
      const date = new Date(2024, 0, 1, 14, 30);
      expect(formatTime(date)).toBe("14:30");
    });

    it("should pad single digit hours and minutes", () => {
      const date = new Date(2024, 0, 1, 9, 5);
      expect(formatTime(date)).toBe("09:05");
    });
  });

  describe("generateCalendarDays", () => {
    it("should generate 42 days for a complete calendar grid", () => {
      const date = new Date(2024, 0, 1); // January 2024
      const days = generateCalendarDays(date);
      expect(days.length).toBe(42);
    });

    it("should mark current month days correctly", () => {
      const date = new Date(2024, 0, 1); // January 2024
      const days = generateCalendarDays(date);
      const currentMonthDays = days.filter((d) => d.isCurrentMonth);
      expect(currentMonthDays.length).toBe(31); // January has 31 days
    });

    it("should include days from previous and next months", () => {
      const date = new Date(2024, 0, 1); // January 2024
      const days = generateCalendarDays(date);
      const prevMonthDays = days.filter(
        (d) => !d.isCurrentMonth && d.date.getMonth() === 11
      );
      const nextMonthDays = days.filter(
        (d) => !d.isCurrentMonth && d.date.getMonth() === 1
      );
      expect(prevMonthDays.length + nextMonthDays.length).toBe(42 - 31);
    });

    it("should correctly identify today", () => {
      const today = new Date();
      const days = generateCalendarDays(today);
      const todayEntry = days.find((d) => d.isToday);
      expect(todayEntry).toBeDefined();
      expect(todayEntry?.date.getDate()).toBe(today.getDate());
    });
  });
});

describe("Reminder System", () => {
  describe("calculateReminderTime", () => {
    it("should calculate 5 minutes before correctly", () => {
      const eventTime = new Date(2024, 0, 15, 14, 30);
      const reminderTime = calculateReminderTime(eventTime, 5);
      expect(reminderTime.getHours()).toBe(14);
      expect(reminderTime.getMinutes()).toBe(25);
    });

    it("should calculate 1 hour before correctly", () => {
      const eventTime = new Date(2024, 0, 15, 14, 30);
      const reminderTime = calculateReminderTime(eventTime, 60);
      expect(reminderTime.getHours()).toBe(13);
      expect(reminderTime.getMinutes()).toBe(30);
    });

    it("should calculate 1 day before correctly", () => {
      const eventTime = new Date(2024, 0, 15, 14, 30);
      const reminderTime = calculateReminderTime(eventTime, 1440);
      expect(reminderTime.getDate()).toBe(14);
      expect(reminderTime.getHours()).toBe(14);
      expect(reminderTime.getMinutes()).toBe(30);
    });
  });

  describe("shouldSendReminder", () => {
    it("should return true when reminder time has passed", () => {
      const reminderTime = new Date(2024, 0, 15, 14, 25);
      const now = new Date(2024, 0, 15, 14, 30);
      expect(shouldSendReminder(reminderTime, now)).toBe(true);
    });

    it("should return true when reminder time equals now", () => {
      const reminderTime = new Date(2024, 0, 15, 14, 30);
      const now = new Date(2024, 0, 15, 14, 30);
      expect(shouldSendReminder(reminderTime, now)).toBe(true);
    });

    it("should return false when reminder time is in the future", () => {
      const reminderTime = new Date(2024, 0, 15, 14, 35);
      const now = new Date(2024, 0, 15, 14, 30);
      expect(shouldSendReminder(reminderTime, now)).toBe(false);
    });
  });
});

describe("Tag System", () => {
  const mockTags = [
    { id: 1, name: "仕事", color: "#EF4444" },
    { id: 2, name: "プライベート", color: "#3B82F6" },
    { id: 3, name: "重要", color: "#F59E0B" },
  ];

  it("should have valid color codes", () => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    mockTags.forEach((tag) => {
      expect(tag.color).toMatch(hexColorRegex);
    });
  });

  it("should have unique ids", () => {
    const ids = mockTags.map((t) => t.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);
  });

  it("should have non-empty names", () => {
    mockTags.forEach((tag) => {
      expect(tag.name.length).toBeGreaterThan(0);
    });
  });
});

describe("Event Validation", () => {
  interface Event {
    title: string;
    startTime: Date;
    endTime: Date;
    allDay: boolean;
  }

  function validateEvent(event: Partial<Event>): string[] {
    const errors: string[] = [];

    if (!event.title || event.title.trim().length === 0) {
      errors.push("タイトルを入力してください");
    }

    if (!event.startTime) {
      errors.push("開始時刻を設定してください");
    }

    if (!event.endTime) {
      errors.push("終了時刻を設定してください");
    }

    if (event.startTime && event.endTime && event.startTime > event.endTime) {
      errors.push("終了時刻は開始時刻より後に設定してください");
    }

    return errors;
  }

  it("should return error for empty title", () => {
    const event = {
      title: "",
      startTime: new Date(),
      endTime: new Date(),
      allDay: false,
    };
    const errors = validateEvent(event);
    expect(errors).toContain("タイトルを入力してください");
  });

  it("should return error when end time is before start time", () => {
    const event = {
      title: "Test Event",
      startTime: new Date(2024, 0, 15, 14, 0),
      endTime: new Date(2024, 0, 15, 13, 0),
      allDay: false,
    };
    const errors = validateEvent(event);
    expect(errors).toContain("終了時刻は開始時刻より後に設定してください");
  });

  it("should pass validation for valid event", () => {
    const event = {
      title: "Valid Event",
      startTime: new Date(2024, 0, 15, 14, 0),
      endTime: new Date(2024, 0, 15, 15, 0),
      allDay: false,
    };
    const errors = validateEvent(event);
    expect(errors.length).toBe(0);
  });
});

describe("Repeating Events", () => {
  // Helper function to check if an event occurs on a specific date (including repeats)
  function isEventOnDate(
    event: { startTime: Date | string; repeatType?: string },
    targetDate: Date
  ): boolean {
    const eventStart = new Date(event.startTime);
    const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const eventDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());

    // If target is before event start, no match
    if (target < eventDate) return false;

    // If same date, always match
    if (target.getTime() === eventDate.getTime()) return true;

    // Check repeat type
    switch (event.repeatType) {
      case "daily":
        return true;
      case "weekly":
        return target.getDay() === eventStart.getDay();
      case "monthly":
        return target.getDate() === eventStart.getDate();
      case "yearly":
        return (
          target.getDate() === eventStart.getDate() &&
          target.getMonth() === eventStart.getMonth()
        );
      default:
        return false;
    }
  }

  it("should match event on its original date", () => {
    const event = { startTime: new Date(2024, 0, 15), repeatType: "none" };
    expect(isEventOnDate(event, new Date(2024, 0, 15))).toBe(true);
  });

  it("should not match non-repeating event on different date", () => {
    const event = { startTime: new Date(2024, 0, 15), repeatType: "none" };
    expect(isEventOnDate(event, new Date(2024, 0, 16))).toBe(false);
  });

  it("should match daily repeating event on subsequent days", () => {
    const event = { startTime: new Date(2024, 0, 15), repeatType: "daily" };
    expect(isEventOnDate(event, new Date(2024, 0, 16))).toBe(true);
    expect(isEventOnDate(event, new Date(2024, 0, 20))).toBe(true);
    expect(isEventOnDate(event, new Date(2024, 1, 1))).toBe(true);
  });

  it("should not match daily repeating event before start date", () => {
    const event = { startTime: new Date(2024, 0, 15), repeatType: "daily" };
    expect(isEventOnDate(event, new Date(2024, 0, 14))).toBe(false);
  });

  it("should match weekly repeating event on same day of week", () => {
    // January 15, 2024 is a Monday
    const event = { startTime: new Date(2024, 0, 15), repeatType: "weekly" };
    expect(isEventOnDate(event, new Date(2024, 0, 22))).toBe(true); // Next Monday
    expect(isEventOnDate(event, new Date(2024, 0, 29))).toBe(true); // Two weeks later
  });

  it("should not match weekly repeating event on different day of week", () => {
    const event = { startTime: new Date(2024, 0, 15), repeatType: "weekly" };
    expect(isEventOnDate(event, new Date(2024, 0, 16))).toBe(false); // Tuesday
    expect(isEventOnDate(event, new Date(2024, 0, 21))).toBe(false); // Sunday
  });

  it("should match monthly repeating event on same day of month", () => {
    const event = { startTime: new Date(2024, 0, 15), repeatType: "monthly" };
    expect(isEventOnDate(event, new Date(2024, 1, 15))).toBe(true); // February 15
    expect(isEventOnDate(event, new Date(2024, 5, 15))).toBe(true); // June 15
  });

  it("should not match monthly repeating event on different day of month", () => {
    const event = { startTime: new Date(2024, 0, 15), repeatType: "monthly" };
    expect(isEventOnDate(event, new Date(2024, 1, 14))).toBe(false);
    expect(isEventOnDate(event, new Date(2024, 1, 16))).toBe(false);
  });

  it("should match yearly repeating event on same date", () => {
    const event = { startTime: new Date(2024, 0, 15), repeatType: "yearly" };
    expect(isEventOnDate(event, new Date(2025, 0, 15))).toBe(true);
    expect(isEventOnDate(event, new Date(2030, 0, 15))).toBe(true);
  });

  it("should not match yearly repeating event on different date", () => {
    const event = { startTime: new Date(2024, 0, 15), repeatType: "yearly" };
    expect(isEventOnDate(event, new Date(2025, 0, 16))).toBe(false);
    expect(isEventOnDate(event, new Date(2025, 1, 15))).toBe(false);
  });
});

describe("People and Departments", () => {
  const mockPeople = [
    { id: 1, name: "田中太郎", email: "tanaka@example.com", color: "#EF4444" },
    { id: 2, name: "山田花子", email: null, color: "#3B82F6" },
  ];

  const mockDepartments = [
    { id: 1, name: "営業部", color: "#10B981" },
    { id: 2, name: "開発部", color: "#8B5CF6" },
  ];

  it("should have valid person data", () => {
    mockPeople.forEach((person) => {
      expect(person.name.length).toBeGreaterThan(0);
      expect(person.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it("should have valid department data", () => {
    mockDepartments.forEach((dept) => {
      expect(dept.name.length).toBeGreaterThan(0);
      expect(dept.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it("should have unique ids for people", () => {
    const ids = mockPeople.map((p) => p.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);
  });

  it("should have unique ids for departments", () => {
    const ids = mockDepartments.map((d) => d.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);
  });
});

describe("Invite Code Generation", () => {
  function generateInviteCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  it("should generate 8 character code", () => {
    const code = generateInviteCode();
    expect(code.length).toBe(8);
  });

  it("should only contain uppercase letters and numbers", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("should generate unique codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode());
    }
    // With 36^8 possible combinations, 100 codes should all be unique
    expect(codes.size).toBe(100);
  });
});


describe("Friends System", () => {
  const mockFriends = [
    { id: 1, name: "田中太郎", telegramChatId: "123456789", telegramUsername: "tanaka", color: "#6366F1" },
    { id: 2, name: "山田花子", telegramChatId: null, telegramUsername: null, color: "#EC4899" },
    { id: 3, name: "佐藤次郎", telegramChatId: "987654321", telegramUsername: "sato", color: "#10B981" },
  ];

  it("should have valid color codes", () => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    mockFriends.forEach((friend) => {
      expect(friend.color).toMatch(hexColorRegex);
    });
  });

  it("should have unique ids", () => {
    const ids = mockFriends.map((f) => f.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);
  });

  it("should have non-empty names", () => {
    mockFriends.forEach((friend) => {
      expect(friend.name.length).toBeGreaterThan(0);
    });
  });

  it("should identify friends with Telegram configured", () => {
    const friendsWithTelegram = mockFriends.filter((f) => f.telegramChatId !== null);
    expect(friendsWithTelegram.length).toBe(2);
  });
});

describe("Custom Message Alert", () => {
  interface Reminder {
    id: number;
    eventId: number;
    minutesBefore: number;
    customMessage: string | null;
    notified: boolean;
  }

  function buildNotificationMessage(
    eventTitle: string,
    eventDate: Date,
    location: string | null,
    minutesBefore: number,
    customMessage: string | null
  ): string {
    const timeLabel: Record<number, string> = {
      5: "5分後",
      15: "15分後",
      30: "30分後",
      60: "1時間後",
      1440: "明日",
    };

    let message = `🔔 予定のリマインダー\n\n` +
      `📅 ${eventTitle}\n` +
      `⏰ ${eventDate.getMonth() + 1}月${eventDate.getDate()}日\n`;
    
    if (location) {
      message += `📍 ${location}\n`;
    }
    
    message += `\n⏳ ${timeLabel[minutesBefore] || `${minutesBefore}分後`}に開始します`;

    if (customMessage) {
      message += `\n\n📝 ${customMessage}`;
    }

    return message;
  }

  it("should include custom message when provided", () => {
    const message = buildNotificationMessage(
      "会議",
      new Date(2024, 0, 15, 14, 0),
      "会議室A",
      15,
      "資料を忘れずに持参してください"
    );
    expect(message).toContain("📝 資料を忘れずに持参してください");
  });

  it("should not include custom message section when null", () => {
    const message = buildNotificationMessage(
      "会議",
      new Date(2024, 0, 15, 14, 0),
      "会議室A",
      15,
      null
    );
    expect(message).not.toContain("📝");
  });

  it("should include location when provided", () => {
    const message = buildNotificationMessage(
      "会議",
      new Date(2024, 0, 15, 14, 0),
      "会議室A",
      15,
      null
    );
    expect(message).toContain("📍 会議室A");
  });

  it("should not include location section when null", () => {
    const message = buildNotificationMessage(
      "会議",
      new Date(2024, 0, 15, 14, 0),
      null,
      15,
      null
    );
    expect(message).not.toContain("📍");
  });
});

describe("Department System", () => {
  const mockDepartments = [
    { id: 1, name: "営業部", color: "#10B981" },
    { id: 2, name: "開発部", color: "#3B82F6" },
    { id: 3, name: "人事部", color: "#F59E0B" },
  ];

  it("should have valid color codes", () => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    mockDepartments.forEach((dept) => {
      expect(dept.color).toMatch(hexColorRegex);
    });
  });

  it("should have unique ids", () => {
    const ids = mockDepartments.map((d) => d.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);
  });

  it("should have non-empty names", () => {
    mockDepartments.forEach((dept) => {
      expect(dept.name.length).toBeGreaterThan(0);
    });
  });
});

describe("Admin Authentication", () => {
  const ADMIN_ID = "admin";
  const ADMIN_PASSWORD = "Sloten1234";

  function verifyAdminCredentials(id: string, password: string): boolean {
    return id === ADMIN_ID && password === ADMIN_PASSWORD;
  }

  it("should authenticate with correct credentials", () => {
    expect(verifyAdminCredentials("admin", "Sloten1234")).toBe(true);
  });

  it("should reject incorrect password", () => {
    expect(verifyAdminCredentials("admin", "wrongpassword")).toBe(false);
  });

  it("should reject incorrect id", () => {
    expect(verifyAdminCredentials("wrongid", "Sloten1234")).toBe(false);
  });

  it("should reject both incorrect", () => {
    expect(verifyAdminCredentials("wrongid", "wrongpassword")).toBe(false);
  });
});


describe("Shared Calendar System", () => {
  // Mock shared calendar data
  const mockSharedCalendar = {
    id: 1,
    name: "チームカレンダー",
    inviteCode: "ABC12345",
    ownerId: 1,
  };

  const mockCalendarMembers = [
    { userId: 1, calendarId: 1, role: "owner" },
    { userId: 2, calendarId: 1, role: "editor" },
    { userId: 3, calendarId: 1, role: "viewer" },
  ];

  // Helper function to check if user can add events
  function canUserAddEvents(userId: number, members: typeof mockCalendarMembers): boolean {
    const member = members.find(m => m.userId === userId);
    if (!member) return false;
    return member.role === "owner" || member.role === "editor";
  }

  // Helper function to check if user can view calendar
  function canUserViewCalendar(userId: number, members: typeof mockCalendarMembers): boolean {
    return members.some(m => m.userId === userId);
  }

  describe("Calendar membership", () => {
    it("should allow owner to add events", () => {
      expect(canUserAddEvents(1, mockCalendarMembers)).toBe(true);
    });

    it("should allow editor to add events", () => {
      expect(canUserAddEvents(2, mockCalendarMembers)).toBe(true);
    });

    it("should not allow viewer to add events", () => {
      expect(canUserAddEvents(3, mockCalendarMembers)).toBe(false);
    });

    it("should not allow non-member to add events", () => {
      expect(canUserAddEvents(999, mockCalendarMembers)).toBe(false);
    });

    it("should allow all members to view calendar", () => {
      expect(canUserViewCalendar(1, mockCalendarMembers)).toBe(true);
      expect(canUserViewCalendar(2, mockCalendarMembers)).toBe(true);
      expect(canUserViewCalendar(3, mockCalendarMembers)).toBe(true);
    });

    it("should not allow non-member to view calendar", () => {
      expect(canUserViewCalendar(999, mockCalendarMembers)).toBe(false);
    });
  });

  describe("Invite code validation", () => {
    function isValidInviteCode(code: string): boolean {
      return /^[A-Z0-9]{8}$/.test(code);
    }

    it("should accept valid 8-character alphanumeric code", () => {
      expect(isValidInviteCode("ABC12345")).toBe(true);
      expect(isValidInviteCode("ABCD1234")).toBe(true);
    });

    it("should reject codes that are too short", () => {
      expect(isValidInviteCode("ABC123")).toBe(false);
    });

    it("should reject codes that are too long", () => {
      expect(isValidInviteCode("ABC123456")).toBe(false);
    });

    it("should reject codes with lowercase letters", () => {
      expect(isValidInviteCode("abc12345")).toBe(false);
    });

    it("should reject codes with special characters", () => {
      expect(isValidInviteCode("ABC1234!")).toBe(false);
    });
  });

  describe("Shared calendar events", () => {
    const mockSharedEvents = [
      { id: 1, calendarId: 1, userId: 1, title: "チームミーティング" },
      { id: 2, calendarId: 1, userId: 2, title: "プロジェクトレビュー" },
      { id: 3, calendarId: 2, userId: 1, title: "別のカレンダーの予定" },
    ];

    function getEventsForCalendar(calendarId: number) {
      return mockSharedEvents.filter(e => e.calendarId === calendarId);
    }

    it("should return only events for the specified calendar", () => {
      const events = getEventsForCalendar(1);
      expect(events.length).toBe(2);
      expect(events.every(e => e.calendarId === 1)).toBe(true);
    });

    it("should return empty array for calendar with no events", () => {
      const events = getEventsForCalendar(999);
      expect(events.length).toBe(0);
    });

    it("should include events created by different users", () => {
      const events = getEventsForCalendar(1);
      const userIds = [...new Set(events.map(e => e.userId))];
      expect(userIds.length).toBeGreaterThan(1);
    });
  });
});

describe("Event Creation with CalendarId", () => {
  interface CreateEventInput {
    title: string;
    startTime: string;
    endTime: string;
    calendarId?: number;
  }

  function validateCreateEventInput(input: CreateEventInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!input.title || input.title.trim().length === 0) {
      errors.push("タイトルを入力してください");
    }
    
    if (!input.startTime) {
      errors.push("開始時刻を設定してください");
    }
    
    if (!input.endTime) {
      errors.push("終了時刻を設定してください");
    }
    
    // calendarId is optional - if not provided, event is personal
    // if provided, it should be a positive number
    if (input.calendarId !== undefined && input.calendarId <= 0) {
      errors.push("無効なカレンダーIDです");
    }
    
    return { valid: errors.length === 0, errors };
  }

  it("should accept event without calendarId (personal event)", () => {
    const input = {
      title: "個人の予定",
      startTime: "2024-01-15T10:00:00",
      endTime: "2024-01-15T11:00:00",
    };
    const result = validateCreateEventInput(input);
    expect(result.valid).toBe(true);
  });

  it("should accept event with valid calendarId (shared event)", () => {
    const input = {
      title: "共有の予定",
      startTime: "2024-01-15T10:00:00",
      endTime: "2024-01-15T11:00:00",
      calendarId: 1,
    };
    const result = validateCreateEventInput(input);
    expect(result.valid).toBe(true);
  });

  it("should reject event with invalid calendarId", () => {
    const input = {
      title: "無効な予定",
      startTime: "2024-01-15T10:00:00",
      endTime: "2024-01-15T11:00:00",
      calendarId: -1,
    };
    const result = validateCreateEventInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("無効なカレンダーIDです");
  });
});
