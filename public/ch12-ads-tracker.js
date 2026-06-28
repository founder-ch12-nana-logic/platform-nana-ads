(function (window, document) {
  "use strict";

  var ALLOWED_EVENTS = new Set([
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

  var config = {
    apiBaseUrl: "",
    eventsPath: "/v1/events",
    autoPageView: true,
    site: "ch12-nana"
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function readUtmParams() {
    var params = new URLSearchParams(window.location.search || "");
    return {
      source: params.get("utm_source") || null,
      medium: params.get("utm_medium") || null,
      campaign: params.get("utm_campaign") || null,
      content: params.get("utm_content") || null,
      term: params.get("utm_term") || null
    };
  }

  function ensureSessionId() {
    var key = "ch12_ads_session_id";
    var fromStorage = window.sessionStorage.getItem(key);
    if (fromStorage) {
      return fromStorage;
    }

    var sessionId = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.sessionStorage.setItem(key, sessionId);
    return sessionId;
  }

  function ensureAnonymousId() {
    var key = "ch12_ads_anonymous_id";
    var fromStorage = window.localStorage.getItem(key);
    if (fromStorage) {
      return fromStorage;
    }

    var anonymousId = "anon_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.localStorage.setItem(key, anonymousId);
    return anonymousId;
  }

  function eventEndpoint() {
    var base = config.apiBaseUrl || "";
    return base + config.eventsPath;
  }

  function trackWithZaraz(eventName, payload) {
    try {
      if (window.zaraz && typeof window.zaraz.track === "function") {
        window.zaraz.track(eventName, payload);
      }
    } catch (err) {
      console.warn("CH12 tracker: zaraz.track failed", err);
    }
  }

  function trackWithApi(payload) {
    return fetch(eventEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "omit"
    }).catch(function (err) {
      console.warn("CH12 tracker: event API send failed", err);
    });
  }

  function buildPayload(eventName, properties) {
    return {
      event_name: eventName,
      event_time_iso: nowIso(),
      page_url: window.location.href,
      page_path: window.location.pathname,
      page_title: document.title || null,
      referrer: document.referrer || null,
      site: config.site,
      session_id: ensureSessionId(),
      anonymous_id: ensureAnonymousId(),
      properties: properties || {},
      utm: readUtmParams()
    };
  }

  function track(eventName, properties) {
    if (!ALLOWED_EVENTS.has(eventName)) {
      console.warn("CH12 tracker: unsupported event", eventName);
      return Promise.resolve(false);
    }

    var payload = buildPayload(eventName, properties);
    trackWithZaraz(eventName, payload);
    return trackWithApi(payload).then(function () {
      return true;
    });
  }

  function init(overrides) {
    config = Object.assign({}, config, overrides || {});
    if (config.autoPageView) {
      track("page_view");
    }
    return api;
  }

  var api = {
    init: init,
    track: track,
    events: {
      pageView: function (properties) { return track("page_view", properties); },
      viewBosWorld: function (properties) { return track("view_bos_world", properties); },
      viewLabWorld: function (properties) { return track("view_lab_world", properties); },
      viewNanaWorld: function (properties) { return track("view_nana_world", properties); },
      viewForgeWorld: function (properties) { return track("view_forge_world", properties); },
      openChatbot: function (properties) { return track("open_chatbot", properties); },
      startChat: function (properties) { return track("start_chat", properties); },
      submitLead: function (properties) { return track("submit_lead", properties); },
      requestAppBlueprint: function (properties) { return track("request_app_blueprint", properties); },
      requestAppExport: function (properties) { return track("request_app_export", properties); },
      selectPlan: function (properties) { return track("select_plan", properties); },
      startCheckout: function (properties) { return track("start_checkout", properties); },
      purchase: function (properties) { return track("purchase", properties); },
      subscriptionStart: function (properties) { return track("subscription_start", properties); }
    }
  };

  window.CH12AdsTracker = api;
})(window, document);
