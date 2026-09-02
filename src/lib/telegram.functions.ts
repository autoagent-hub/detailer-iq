import { createServerFn } from "@tanstack/react-start";

type AlertInput = {
  detailerId: string;
  customerName: string;
  customerPhone: string;
  vehicle: string;
  service: { label: string; price: number };
  addons: { label: string; price: number }[];
  estimate: number;
  notes?: string;
  photoPaths?: string[];
};

function fmt(value: number, currency: string): string {
  const amount = Math.round(Number(value) || 0);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

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
      .select(
        "telegram_chat_id, business_name, currency, notify_telegram, notify_include_photos, notify_include_notes",
      )
      .eq("id", data.detailerId)
      .maybeSingle();

    const chatId = profile?.telegram_chat_id;
    if (!chatId) return { sent: false, reason: "not_connected" as const };
    if (profile.notify_telegram === false) return { sent: false, reason: "muted" as const };

    const currency = profile.currency || "USD";
    const photos = data.photoPaths ?? [];

    const lines = [
      `🚨 NEW QUOTE REQUEST`,
      ``,
      data.customerName,
      data.vehicle,
      `${data.service.label} — ${fmt(data.service.price, currency)}`,
      ...data.addons.map((a) => `${a.label} — ${fmt(a.price, currency)}`),
      ``,
      `Estimated total: ${fmt(data.estimate, currency)}`,
    ];

    if (photos.length) lines.push(``, `${photos.length} photo${photos.length === 1 ? "" : "s"}`);
    if (data.notes && profile.notify_include_notes !== false) lines.push(``, `Notes: ${data.notes}`);
    lines.push(``, data.customerPhone);

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: lines.join("\n") }),
      });

      if (photos.length && profile.notify_include_photos !== false) {
        const { data: signed } = await supabaseAdmin.storage
          .from("quote-photos")
          .createSignedUrls(photos.slice(0, 10), 60 * 60 * 24 * 7);
        const urls = (signed ?? []).map((s) => s.signedUrl).filter(Boolean);
        if (urls.length === 1) {
          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, photo: urls[0] }),
          });
        } else if (urls.length > 1) {
          await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              media: urls.map((url) => ({ type: "photo", media: url })),
            }),
          });
        }
      }

      return { sent: true as const };
    } catch (error) {
      console.error("Telegram alert failed", error);
      return { sent: false, reason: "send_failed" as const };
    }
  });
