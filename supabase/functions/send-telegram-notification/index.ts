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

    const now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
    let message = "";

    if (payload.type === "borrow") {
      message = [
        "\ud83d\udcf1 \u8a2d\u5099\u501f\u7528\u901a\u77e5",
        `\u8a2d\u5099\uff1a${payload.deviceName}`,
        `\u501f\u7528\u4eba\uff1a${payload.userEmail}`,
        payload.purpose ? `\u7528\u9014\uff1a${payload.purpose}` : null,
        `\u6642\u9593\uff1a${now}`,
      ]
        .filter(Boolean)
        .join("\n");
    } else if (payload.type === "return") {
      message = [
        "\u2705 \u8a2d\u5099\u6b78\u9084\u901a\u77e5",
        `\u8a2d\u5099\uff1a${payload.deviceName}`,
        `\u6b78\u9084\u4eba\uff1a${payload.userEmail}`,
        `\u6642\u9593\uff1a${now}`,
      ].join("\n");
    } else {
      return new Response(JSON.stringify({ message: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const telegramUrl = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chat_id,
        text: message,
      }),
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
