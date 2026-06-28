const ALLOWED_EVENTS = new Set([
  "page_view",
  "view_bos_world",
  "view_lab_world",
  "view_nana_world",
  "view_forge_world",
  "open_chatbot",
  "start_chat",
  "submit_lead",
  "request_app_blueprint",
  "request_app_export",
  "select_plan",
  "start_checkout",
  "purchase",
  "subscription_start"
]);

function jsonResponse(body, status = 200, origin = "*") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}

function hashSha256Hex(text) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then((buf) => {
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  });
}

async function normalizeEmailForAdApi(value) {
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return hashSha256Hex(normalized);
}

async function forwardToInternalWebhook(env, event) {
  if (!env.CH12_INTERNAL_WEBHOOK_URL) {
    return { target: "internal_webhook", skipped: true, reason: "not_configured" };
  }

  const headers = { "content-type": "application/json" };
  if (env.CH12_INTERNAL_WEBHOOK_BEARER) {
    headers.authorization = `Bearer ${env.CH12_INTERNAL_WEBHOOK_BEARER}`;
  }

  const response = await fetch(env.CH12_INTERNAL_WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(event)
  });

  return { target: "internal_webhook", status: response.status, ok: response.ok };
}

async function forwardToMeta(env, event, reqMeta) {
  if (!env.META_PIXEL_ID || !env.META_ACCESS_TOKEN) {
    return { target: "meta", skipped: true, reason: "not_configured" };
  }

  const emailHash = await normalizeEmailForAdApi(event?.user?.email || event?.properties?.email);
  const body = {
    data: [
      {
        event_name: event.event_name,
        event_time: Math.floor(Date.parse(event.event_time_iso || new Date().toISOString()) / 1000),
        action_source: "website",
        event_source_url: event.page_url,
        user_data: {
          client_ip_address: reqMeta.ip,
          client_user_agent: reqMeta.userAgent,
          em: emailHash ? [emailHash] : undefined
        },
        custom_data: {
          value: event.properties?.value,
          currency: event.properties?.currency
        }
      }
    ]
  };

  const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(env.META_PIXEL_ID)}/events?access_token=${encodeURIComponent(env.META_ACCESS_TOKEN)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  return { target: "meta", status: response.status, ok: response.ok };
}

async function forwardToTikTok(env, event, reqMeta) {
  if (!env.TIKTOK_PIXEL_CODE || !env.TIKTOK_ACCESS_TOKEN) {
    return { target: "tiktok", skipped: true, reason: "not_configured" };
  }

  const url = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
  const body = {
    pixel_code: env.TIKTOK_PIXEL_CODE,
    event: event.event_name,
    event_id: event.event_id || crypto.randomUUID(),
    timestamp: event.event_time_iso || new Date().toISOString(),
    context: {
      page: {
        url: event.page_url,
        referrer: event.referrer || ""
      },
      user: {
        external_id: event.anonymous_id || undefined,
        ip: reqMeta.ip,
        user_agent: reqMeta.userAgent
      }
    },
    properties: event.properties || {}
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "access-token": env.TIKTOK_ACCESS_TOKEN
    },
    body: JSON.stringify(body)
  });

  return { target: "tiktok", status: response.status, ok: response.ok };
}

async function forwardToGa4(env, event, reqMeta) {
  if (!env.GA4_MEASUREMENT_ID || !env.GA4_API_SECRET) {
    return { target: "ga4", skipped: true, reason: "not_configured" };
  }

  const clientId = event.anonymous_id || reqMeta.ip || crypto.randomUUID();
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(env.GA4_MEASUREMENT_ID)}&api_secret=${encodeURIComponent(env.GA4_API_SECRET)}`;
  const body = {
    client_id: clientId,
    user_id: event.user_id || undefined,
    events: [
      {
        name: event.event_name,
        params: {
          page_location: event.page_url,
          page_referrer: event.referrer || undefined,
          page_title: event.page_title || undefined,
          engagement_time_msec: 1,
          ...event.properties
        }
      }
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  return { target: "ga4", status: response.status, ok: response.ok };
}

function getOrigin(request, env) {
  const reqOrigin = request.headers.get("origin") || "*";
  if (!env.CORS_ALLOW_ORIGIN || env.CORS_ALLOW_ORIGIN === "*") {
    return "*";
  }
  return reqOrigin === env.CORS_ALLOW_ORIGIN ? reqOrigin : env.CORS_ALLOW_ORIGIN;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = getOrigin(request, env);

    if (request.method === "OPTIONS") {
      return jsonResponse({ ok: true }, 200, origin);
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true, service: "ch12-nana-ads-worker" }, 200, origin);
    }

    if (request.method === "POST" && url.pathname === "/v1/events") {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: "invalid_json" }, 400, origin);
      }

      if (!payload || !ALLOWED_EVENTS.has(payload.event_name)) {
        return jsonResponse({ ok: false, error: "invalid_event_name" }, 400, origin);
      }

      const event = {
        ...payload,
        event_id: payload.event_id || crypto.randomUUID(),
        event_time_iso: payload.event_time_iso || new Date().toISOString(),
        received_at: new Date().toISOString()
      };

      const reqMeta = {
        ip: request.headers.get("cf-connecting-ip") || null,
        userAgent: request.headers.get("user-agent") || null
      };

      const forwardingResults = await Promise.allSettled([
        forwardToInternalWebhook(env, event),
        forwardToMeta(env, event, reqMeta),
        forwardToTikTok(env, event, reqMeta),
        forwardToGa4(env, event, reqMeta)
      ]);

      const destinations = forwardingResults.map((result) => {
        if (result.status === "fulfilled") return result.value;
        return { target: "unknown", ok: false, error: "forward_failed" };
      });

      return jsonResponse({
        ok: true,
        accepted: true,
        event_id: event.event_id,
        destinations
      }, 202, origin);
    }

    return jsonResponse({ ok: false, error: "not_found" }, 404, origin);
  }
};
