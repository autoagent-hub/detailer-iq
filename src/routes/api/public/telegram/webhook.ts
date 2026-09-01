import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

function deriveSecret(token: string): string {
  return createHash("sha256").update(`telegram-webhook:${token}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function send(token: string, chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env["TELEGRAM_BOT_TOKEN"];
        if (!token) return new Response("Not configured", { status: 503 });

        const provided = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(provided, deriveSecret(token))) {
          return new Response("Unauthorized", { status: 401 });
        }

        const update = (await request.json()) as {
          message?: { chat?: { id?: number }; text?: string };
        };
        const chatId = update.message?.chat?.id;
        const text = (update.message?.text ?? "").trim();
        if (!chatId) return Response.json({ ok: true, ignored: true });

        const match = /^\/start(?:\s+([A-Za-z0-9]+))?$/.exec(text);
        if (!match) {
          await send(
            token,
            chatId,
            "Open your QuoteFlow dashboard and tap “Connect Telegram Bot” to link this chat.",
          );
          return Response.json({ ok: true });
        }

        const code = match[1];
        if (!code) {
          await send(
            token,
            chatId,
            "Almost there — use the Connect Telegram Bot button in your QuoteFlow dashboard so I know which business this chat belongs to.",
          );
          return Response.json({ ok: true });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, business_name")
          .eq("telegram_auth_code", code)
          .maybeSingle();

        if (!profile) {
          await send(token, chatId, "That link has expired. Grab a fresh one from your dashboard.");
          return Response.json({ ok: true });
        }

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ telegram_chat_id: String(chatId) })
          .eq("id", profile.id);

        if (error) {
          await send(token, chatId, "Something went wrong linking this chat. Please try again.");
          return Response.json({ ok: false }, { status: 500 });
        }

        await send(
          token,
          chatId,
          `✅ Connected — ${profile.business_name}\n\nEvery new quote request will land right here.`,
        );
        return Response.json({ ok: true });
      },
    },
  },
});
