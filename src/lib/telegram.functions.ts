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

const API = "https://api.telegram.org/bot";

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

function esc(text: string): string {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function pad(label: string, price: string, width = 26): string {
  const dots = Math.max(1, width - label.length);
  return `${esc(label)}${" ".repeat(dots)}${price}`;
}

/**
 * Sends a real-time quote alert to the detailer's Telegram chat.
 * Photos are streamed straight from private storage to Telegram — no image
 * bytes are ever stored in the database.
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
    const photos = (data.photoPaths ?? []).slice(0, 10);
    const includePhotos = photos.length > 0 && profile.notify_include_photos !== false;

    const items = [
      pad(data.service.label, fmt(data.service.price, currency)),
      ...data.addons.map((a) => pad(a.label, fmt(a.price, currency))),
    ];

    const body = [
      `🚨 <b>NEW QUOTE REQUEST</b>`,
      profile.business_name ? `<i>${esc(profile.business_name)}</i>` : "",
      ``,
      `👤 <b>${esc(data.customerName)}</b>`,
      `🚗 ${esc(data.vehicle)}`,
      ``,
      `<b>Requested work</b>`,
      `<pre>${items.join("\n")}</pre>`,
      `💰 <b>Estimated total: ${fmt(data.estimate, currency)}</b>`,
      includePhotos
        ? `\n📷 ${photos.length} photo${photos.length === 1 ? "" : "s"} attached below`
        : "",
      data.notes && profile.notify_include_notes !== false
        ? `\n📝 <b>Notes</b>\n${esc(data.notes)}`
        : "",
      ``,
      `📞 <a href="tel:${esc(data.customerPhone)}">${esc(data.customerPhone)}</a>`,
    ]
      .filter((line) => line !== "")
      .join("\n");

    const post = (method: string, payload: unknown) =>
      fetch(`${API}${token}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

    try {
      const res = await post("sendMessage", {
        chat_id: chatId,
        text: body,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
      if (!res.ok) console.error("Telegram sendMessage failed", await res.text());

      if (includePhotos) {
        // Stream the private files through Telegram as real uploads so the
        // detailer sees images even though nothing is stored in the database.
        const files: { name: string; blob: Blob }[] = [];
        for (const [index, path] of photos.entries()) {
          const { data: file } = await supabaseAdmin.storage.from("quote-photos").download(path);
          if (file) files.push({ name: `photo${index}.jpg`, blob: file });
        }

        if (files.length === 1) {
          const form = new FormData();
          form.append("chat_id", String(chatId));
          form.append("caption", `Photo from ${data.customerName}`);
          form.append("photo", files[0]!.blob, files[0]!.name);
          const photoRes = await fetch(`${API}${token}/sendPhoto`, { method: "POST", body: form });
          if (!photoRes.ok) console.error("Telegram sendPhoto failed", await photoRes.text());
        } else if (files.length > 1) {
          const form = new FormData();
          form.append("chat_id", String(chatId));
          form.append(
            "media",
            JSON.stringify(
              files.map((f, i) => ({
                type: "photo",
                media: `attach://${f.name}`,
                ...(i === 0 ? { caption: `Photos from ${data.customerName}` } : {}),
              })),
            ),
          );
          for (const f of files) form.append(f.name, f.blob, f.name);
          const groupRes = await fetch(`${API}${token}/sendMediaGroup`, {
            method: "POST",
            body: form,
          });
          if (!groupRes.ok) console.error("Telegram sendMediaGroup failed", await groupRes.text());
        }
      }

      return { sent: true as const };
    } catch (error) {
      console.error("Telegram alert failed", error);
      return { sent: false, reason: "send_failed" as const };
    }
  });
