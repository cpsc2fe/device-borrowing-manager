import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  type: "borrow" | "return";
  deviceName: string;
  userEmail: string;
  purpose?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SERVICE_ROLE_KEY") ?? ""
    );

    const { data: config } = await supabase
      .from("telegram_config")
      .select("*")
      .eq("is_enabled", true)
      .single();

    if (!config) {
      return new Response(
        JSON.stringify({ message: "Telegram notification disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: NotificationPayload = await req.json();

    const { data: devices } = await supabase
      .from("devices_with_borrower")
      .select("name,status,borrower_email")
      .order("name");

    const now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
    let message = "";

    if (payload.type === "borrow") {
      message = [
        "\ud83d\udcf1 \u8a2d\u5099\u501f\u7528\u901a\u77e5",
        "━━━━━━━━━━━━━━━",
        `\u8a2d\u5099\uff1a${payload.deviceName}`,
        `\u501f\u7528\u8005\uff1a${payload.userEmail}`,
        payload.purpose ? `\u7528\u9014\uff1a${payload.purpose}` : null,
        `\u6642\u9593\uff1a${now}`,
      ]
        .filter(Boolean)
        .join("\n");
    } else if (payload.type === "return") {
      message = [
        "\u2705 \u8a2d\u5099\u6b78\u9084\u901a\u77e5",
        "━━━━━━━━━━━━━━━",
        `\u8a2d\u5099\uff1a${payload.deviceName}`,
        `\u6b78\u9084\u8005\uff1a${payload.userEmail}`,
        `\u6642\u9593\uff1a${now}`,
      ].join("\n");
    } else {
      return new Response(JSON.stringify({ message: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (devices && devices.length > 0) {
      message += "\n\n\ud83d\udcca \u76ee\u524d\u72c0\u614b\uff1a";
      devices.forEach((device) => {
        if (device.status === "available") {
          message += `\n\ud83d\udfe2 ${device.name} - \u53ef\u501f\u7528`;
        } else if (device.status === "borrowed") {
          const borrower = device.borrower_email || "\u672a\u77e5";
          message += `\n\ud83d\udd34 ${device.name} - ${borrower}`;
        } else if (device.status === "maintenance") {
          message += `\n\ud83d\udfe1 ${device.name} - \u7dad\u4fee\u4e2d`;
        }
      });
    }

    const telegramUrl = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;
    const telegramPayload: Record<string, unknown> = {
      chat_id: config.chat_id,
      text: message,
      parse_mode: "HTML",
    };

    if (config.thread_id) {
      telegramPayload.message_thread_id = parseInt(config.thread_id, 10);
    }

    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(telegramPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telegram error: ${errorText}`);
    }

    return new Response(JSON.stringify({ message: "Notification sent" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
