import { Request, Response } from "express";
import * as db from "./db";

// Random color generator for new friends
function generateRandomColor(): string {
  const colors = [
    "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16",
    "#22C55E", "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9",
    "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#D946EF",
    "#EC4899", "#F43F5E",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Parse Telegram message and extract registration info
interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

// Send message via Telegram Bot API
async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("[Telegram] Failed to send message:", error);
    return false;
  }
}

// Handle Telegram webhook
export async function handleTelegramWebhook(req: Request, res: Response) {
  try {
    const update: TelegramUpdate = req.body;
    
    if (!update.message?.text) {
      res.sendStatus(200);
      return;
    }

    const message = update.message;
    const text = message.text!.trim();
    const chatId = message.chat.id.toString();
    const fromUser = message.from;
    
    // Get bot token from query params (set when registering webhook)
    const botToken = req.query.token as string;
    
    if (!botToken) {
      console.error("[Telegram Webhook] No bot token provided");
      res.sendStatus(200);
      return;
    }

    // Command: /register <user_code>
    // User code format: USER_<userId>
    if (text.startsWith("/register ") || text.startsWith("/start ")) {
      const parts = text.split(" ");
      if (parts.length < 2) {
        await sendTelegramMessage(
          botToken,
          chatId,
          "📝 <b>友達登録</b>\n\n" +
          "登録するには、カレンダーアプリの設定画面から「友達登録コード」を取得し、\n" +
          "<code>/register USER_xxxxx</code>\n" +
          "の形式で送信してください。"
        );
        res.sendStatus(200);
        return;
      }

      const userCode = parts[1];
      if (!userCode.startsWith("USER_")) {
        await sendTelegramMessage(
          botToken,
          chatId,
          "❌ 無効なコードです。\n\n" +
          "カレンダーアプリの設定画面から正しい「友達登録コード」を取得してください。"
        );
        res.sendStatus(200);
        return;
      }

      const userId = parseInt(userCode.replace("USER_", ""), 10);
      if (isNaN(userId)) {
        await sendTelegramMessage(
          botToken,
          chatId,
          "❌ 無効なコードです。"
        );
        res.sendStatus(200);
        return;
      }

      // Register as friend
      const name = [fromUser.first_name, fromUser.last_name].filter(Boolean).join(" ");
      const username = fromUser.username ?? null;
      
      try {
        const result = await db.registerFriendFromTelegram({
          userId,
          name,
          telegramChatId: chatId,
          telegramUsername: username,
          color: generateRandomColor(),
        });

        if (result.isNew) {
          await sendTelegramMessage(
            botToken,
            chatId,
            `✅ <b>登録完了！</b>\n\n` +
            `${name}さん、友達として登録されました。\n` +
            `これからカレンダーの予定通知を受け取ることができます。`
          );
        } else {
          await sendTelegramMessage(
            botToken,
            chatId,
            `ℹ️ <b>既に登録済みです</b>\n\n` +
            `${name}さんは既に友達として登録されています。`
          );
        }
      } catch (error) {
        console.error("[Telegram Webhook] Registration failed:", error);
        await sendTelegramMessage(
          botToken,
          chatId,
          "❌ 登録に失敗しました。しばらくしてから再度お試しください。"
        );
      }
    }
    // Command: /help
    else if (text === "/help") {
      await sendTelegramMessage(
        botToken,
        chatId,
        "📚 <b>コマンド一覧</b>\n\n" +
        "<code>/register USER_xxxxx</code> - 友達として登録\n" +
        "<code>/help</code> - ヘルプを表示\n" +
        "<code>/status</code> - 登録状態を確認"
      );
    }
    // Command: /status
    else if (text === "/status") {
      const friend = await db.findFriendByTelegramChatId(chatId);
      if (friend) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `✅ <b>登録済み</b>\n\n` +
          `名前: ${friend.name}\n` +
          `カレンダーの予定通知を受け取ることができます。`
        );
      } else {
        await sendTelegramMessage(
          botToken,
          chatId,
          `❌ <b>未登録</b>\n\n` +
          `まだ友達として登録されていません。\n` +
          `<code>/register USER_xxxxx</code> で登録してください。`
        );
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("[Telegram Webhook] Error:", error);
    res.sendStatus(200);
  }
}
