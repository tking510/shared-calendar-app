/**
 * Reminder notification job
 * This module handles sending Telegram notifications for upcoming events
 */

import { getPendingReminders, markReminderNotified, sendTelegramMessage, getEventFriends, getUserById } from "./db";

const REMINDER_LABELS: Record<number, string> = {
  5: "5分後",
  15: "15分後",
  30: "30分後",
  60: "1時間後",
  1440: "明日",
};

/**
 * タイムゾーン変換なしで時刻をフォーマット（HH:MM形式）
 * DBにはローカル時間として保存されている
 */
function formatEventTime(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * タイムゾーン変換なしで日付をフォーマット
 * DBにはローカル時間として保存されている
 */
function formatEventDate(date: Date): string {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${month}月${day}日`;
}

export async function processReminders(): Promise<{ processed: number; sent: number }> {
  let processed = 0;
  let sent = 0;

  try {
    const pendingReminders = await getPendingReminders();
    
    for (const { reminder, event } of pendingReminders) {
      processed++;
      
      const timeLabel = REMINDER_LABELS[reminder.minutesBefore] || `${reminder.minutesBefore}分後`;
      const eventDate = new Date(event.startTime);
      
      // Build the notification message
      let message = `🔔 <b>予定のリマインダー</b>\n\n` +
        `📅 <b>${event.title}</b>\n` +
        `⏰ ${formatEventDate(eventDate)} ${formatEventTime(eventDate)}\n` +
        (event.location ? `📍 ${event.location}\n` : "") +
        `\n⏳ ${timeLabel}に開始します`;

      // Add custom message if present
      if (reminder.customMessage) {
        message += `\n\n📝 ${reminder.customMessage}`;
      }

      // Check if notifySelf is enabled and user has a telegram username
      let messageWithMention = message;
      if (event.notifySelf) {
        try {
          const eventUser = await getUserById(event.userId);
          if (eventUser?.telegramUsername) {
            // Add mention to the message
            const username = eventUser.telegramUsername.startsWith('@') 
              ? eventUser.telegramUsername 
              : `@${eventUser.telegramUsername}`;
            messageWithMention = `${username}\n\n${message}`;
            console.log(`[Reminder] Adding mention for user ${username}`);
          }
        } catch (userError) {
          console.error(`[Reminder] Error getting user for mention:`, userError);
        }
      }

      const success = await sendTelegramMessage(event.userId, messageWithMention);

      // Send notifications to friends tagged in the event
      try {
        const taggedFriends = await getEventFriends(event.id);
        for (const friend of taggedFriends) {
          if (friend.telegramChatId) {
            // Send notification to friend using the event owner's bot token
            await sendTelegramMessage(event.userId, message, friend.telegramChatId);
            console.log(`[Reminder] Sent notification to friend ${friend.name} (${friend.telegramChatId})`);
          }
        }
      } catch (friendError) {
        console.error(`[Reminder] Error sending to friends:`, friendError);
      }
      
      if (success) {
        sent++;
        console.log(`[Reminder] Sent notification for event ${event.id} to user ${event.userId}`);
      } else {
        console.log(`[Reminder] Failed to send notification for event ${event.id} (Telegram not configured or error)`);
      }
      
      // Mark as notified regardless of send success to avoid repeated attempts
      await markReminderNotified(reminder.id);
    }
    
    return { processed, sent };
  } catch (error) {
    console.error("[Reminder] Error processing reminders:", error);
    return { processed, sent };
  }
}

// Run reminder check every minute
let intervalId: ReturnType<typeof setInterval> | null = null;

export function startReminderJob(): void {
  if (intervalId) {
    console.log("[Reminder] Job already running");
    return;
  }
  
  console.log("[Reminder] Starting reminder job (checking every minute)");
  
  // Run immediately on start
  processReminders().then(({ processed, sent }) => {
    if (processed > 0) {
      console.log(`[Reminder] Initial check: processed ${processed}, sent ${sent}`);
    }
  });
  
  // Then run every minute
  intervalId = setInterval(async () => {
    const { processed, sent } = await processReminders();
    if (processed > 0) {
      console.log(`[Reminder] Processed ${processed} reminders, sent ${sent} notifications`);
    }
  }, 60 * 1000);
}

export function stopReminderJob(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Reminder] Stopped reminder job");
  }
}
