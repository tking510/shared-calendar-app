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
