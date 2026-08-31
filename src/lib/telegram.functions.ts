import { createServerFn } from "@tanstack/react-start";

type AlertInput = {
  detailerId: string;
  customerName: string;
  customerPhone: string;
  vehicle: string;
  addons: string[];
  estimate: number;
};

/**
 * Sends a real-time quote alert to the detailer's Telegram chat.
 * Silently no-ops when the bot token or the detailer's chat isn't connected yet.
 */
export const sendQuoteAlert = createServerFn({ method: "POST" })
  .inputValidator((data: AlertInput) => data)
  .handler(async ({ data }) => {
    const token = process.env["TELEGRAM_BOT_TOKEN"];
    if (!token) return { sent: false, reason: "no_bot_token" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("telegram_chat_id, business_name")
      .eq("id", data.detailerId)
      .maybeSingle();

    const chatId = profile?.telegram_chat_id;
    if (!chatId) return { sent: false, reason: "not_connected" as const };

    const lines = [
      `🚗 New quote request — ${profile.business_name}`,
      ``,
      `Customer: ${data.customerName}`,
      `Phone: ${data.customerPhone}`,
      `Vehicle: ${data.vehicle}`,
      `Add-ons: ${data.addons.length ? data.addons.join(", ") : "None"}`,
      `Estimate: $${Math.round(data.estimate)}`,
    ];

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: lines.join("\n") }),
      });
      return { sent: true as const };
    } catch (error) {
      console.error("Telegram alert failed", error);
      return { sent: false, reason: "send_failed" as const };
    }
  });
