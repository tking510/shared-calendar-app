import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

// Generate random invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Tags API
  tags: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getUserTags(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createTag({
          userId: ctx.user.id,
          name: input.name,
          color: input.color,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(100).optional(),
          color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateTag(input.id, ctx.user.id, {
          name: input.name,
          color: input.color,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteTag(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Events API
  events: router({
    list: protectedProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          calendarId: z.number().optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const startDate = input?.startDate ? new Date(input.startDate) : undefined;
        const endDate = input?.endDate ? new Date(input.endDate) : undefined;

        if (input?.calendarId) {
          return db.getSharedCalendarEvents(input.calendarId, startDate, endDate);
        }
        return db.getUserEvents(ctx.user.id, startDate, endDate);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const event = await db.getEventById(input.id);
        if (!event) return null;
        const eventTags = await db.getEventTags(input.id);
        const eventReminders = await db.getEventReminders(input.id);
        const eventPeople = await db.getEventPeople(input.id);
        const eventDepartments = await db.getEventDepartments(input.id);
        return { ...event, tags: eventTags, reminders: eventReminders, people: eventPeople, departments: eventDepartments };
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          description: z.string().optional(),
          location: z.string().max(255).optional(),
          startTime: z.string(),
          endTime: z.string(),
          allDay: z.boolean().optional(),
          repeatType: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).optional(),
          calendarId: z.number().optional(),
          tagIds: z.array(z.number()).optional(),
          reminderMinutes: z.array(z.number()).optional(),
          personIds: z.array(z.number()).optional(),
          departmentIds: z.array(z.number()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const eventId = await db.createEvent({
          userId: ctx.user.id,
          calendarId: input.calendarId ?? null,
          title: input.title,
          description: input.description ?? null,
          location: input.location ?? null,
          startTime: new Date(input.startTime),
          endTime: new Date(input.endTime),
          allDay: input.allDay ?? false,
          repeatType: input.repeatType ?? "none",
        });

        // Set tags
        if (input.tagIds && input.tagIds.length > 0) {
          await db.setEventTags(eventId, input.tagIds);
        }

        // Create reminders
        if (input.reminderMinutes && input.reminderMinutes.length > 0) {
          for (const minutes of input.reminderMinutes) {
            await db.createReminder({ eventId, minutesBefore: minutes });
          }
        }

        // Set people
        if (input.personIds && input.personIds.length > 0) {
          await db.setEventPeople(eventId, input.personIds);
        }

        // Set departments
        if (input.departmentIds && input.departmentIds.length > 0) {
          await db.setEventDepartments(eventId, input.departmentIds);
        }

        return { id: eventId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          location: z.string().max(255).optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          allDay: z.boolean().optional(),
          repeatType: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).optional(),
          tagIds: z.array(z.number()).optional(),
          reminderMinutes: z.array(z.number()).optional(),
          personIds: z.array(z.number()).optional(),
          departmentIds: z.array(z.number()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const updateData: Record<string, unknown> = {};
        if (input.title !== undefined) updateData.title = input.title;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.location !== undefined) updateData.location = input.location;
        if (input.startTime !== undefined) updateData.startTime = new Date(input.startTime);
        if (input.endTime !== undefined) updateData.endTime = new Date(input.endTime);
        if (input.allDay !== undefined) updateData.allDay = input.allDay;
        if (input.repeatType !== undefined) updateData.repeatType = input.repeatType;

        await db.updateEvent(input.id, ctx.user.id, updateData);

        // Update tags if provided
        if (input.tagIds !== undefined) {
          await db.setEventTags(input.id, input.tagIds);
        }

        // Update reminders if provided
        if (input.reminderMinutes !== undefined) {
          await db.deleteEventReminders(input.id);
          for (const minutes of input.reminderMinutes) {
            await db.createReminder({ eventId: input.id, minutesBefore: minutes });
          }
        }

        // Update people if provided
        if (input.personIds !== undefined) {
          await db.setEventPeople(input.id, input.personIds);
        }

        // Update departments if provided
        if (input.departmentIds !== undefined) {
          await db.setEventDepartments(input.id, input.departmentIds);
        }

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteEvent(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Shared Calendars API
  calendars: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getUserSharedCalendars(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(255) }))
      .mutation(async ({ ctx, input }) => {
        const inviteCode = generateInviteCode();
        const id = await db.createSharedCalendar({
          ownerId: ctx.user.id,
          name: input.name,
          inviteCode,
        });
        return { id, inviteCode };
      }),

    join: protectedProcedure
      .input(z.object({ inviteCode: z.string().length(8) }))
      .mutation(async ({ ctx, input }) => {
        const calendar = await db.getSharedCalendarByInviteCode(input.inviteCode);
        if (!calendar) {
          throw new Error("Invalid invite code");
        }
        await db.joinSharedCalendar(calendar.id, ctx.user.id);
        return { id: calendar.id, name: calendar.name };
      }),

    members: protectedProcedure
      .input(z.object({ calendarId: z.number() }))
      .query(({ input }) => {
        return db.getCalendarMembers(input.calendarId);
      }),
  }),

  // People API
  people: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getUserPeople(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          email: z.string().email().optional(),
          color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createPerson({
          userId: ctx.user.id,
          name: input.name,
          email: input.email ?? null,
          color: input.color,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(100).optional(),
          email: z.string().email().optional(),
          color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.updatePerson(input.id, ctx.user.id, {
          name: input.name,
          email: input.email,
          color: input.color,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePerson(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Departments API
  departments: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getUserDepartments(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createDepartment({
          userId: ctx.user.id,
          name: input.name,
          color: input.color,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(100).optional(),
          color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateDepartment(input.id, ctx.user.id, {
          name: input.name,
          color: input.color,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteDepartment(input.id, ctx.user.id);
        return { success: true };
      }),

    // Get user's department memberships
    myDepartments: protectedProcedure.query(({ ctx }) => {
      return db.getUserDepartmentMemberships(ctx.user.id);
    }),

    // Set user's department memberships
    setMyDepartments: protectedProcedure
      .input(z.object({ departmentIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        await db.setUserDepartments(ctx.user.id, input.departmentIds);
        return { success: true };
      }),
  }),

  // Telegram Settings API
  telegram: router({
    get: protectedProcedure.query(({ ctx }) => {
      return db.getTelegramSettings(ctx.user.id);
    }),

    update: protectedProcedure
      .input(
        z.object({
          botToken: z.string().optional(),
          chatId: z.string().optional(),
          enabled: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.upsertTelegramSettings(ctx.user.id, input);
        return { success: true };
      }),

    test: protectedProcedure.mutation(async ({ ctx }) => {
      const success = await db.sendTelegramMessage(
        ctx.user.id,
        "🔔 <b>テスト通知</b>\n\nTelegram連携が正常に設定されました！"
      );
      return { success };
    }),
  }),
});

export type AppRouter = typeof appRouter;
