import { apiRequest } from "./api/client";
export interface EventProperties {
  [key: string]: any;
}

/** Get or generate a persistent anonymous session ID for tracking funnels */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("byv_analytics_sid");
  if (!sid) {
    sid = "sid_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    sessionStorage.setItem("byv_analytics_sid", sid);
  }
  return sid;
}

/** Extract URL UTM params if available */
export function getUtmParams() {
  if (typeof window === "undefined") return {};
  const urlParams = new URLSearchParams(window.location.search);
  return {
    utmSource: urlParams.get("utm_source") || undefined,
    utmMedium: urlParams.get("utm_medium") || undefined,
    utmCampaign: urlParams.get("utm_campaign") || undefined,
  };
}

/** Fire-and-forget analytics event logger */
export function trackEvent(eventType: string, properties: EventProperties = {}, userType: "customer" | "vendor" | "admin" | "guest" = "guest") {
  if (typeof window === "undefined") return;

  const utm = getUtmParams();
  const body = {
    eventType,
    properties,
    userType,
    sessionId: getSessionId(),
    ...utm,
  };

  // Fire async call in background without blocking UI
  apiRequest("/analytics/track", {
    method: "POST",
    body,
  }).catch(() => {
    // Silent fail for analytics logging so user experience is never degraded
  });
}

/* Helper functions for standard BYV events */
export function trackSignup(userId: string, phone?: string) {
  trackEvent("user_signup", { userId, phone }, "customer");
}

export function trackLogin(userId: string, role: "customer" | "vendor" | "admin" = "customer") {
  trackEvent(role === "vendor" ? "owner_login" : "login", { userId }, role);
}

export function trackLogout(userId?: string) {
  trackEvent("logout", { userId });
}

export function trackVenueSearch(query: string, sport?: string, city?: string, resultsCount: number = 0) {
  trackEvent("venue_search", { query, sport, city, resultsCount });
  if (resultsCount === 0) {
    trackEvent("search_zero_results", { query, sport, city });
  }
}

export function trackVenueView(listingId: string, title: string, sport?: string) {
  trackEvent("venue_view", { listingId, title, sport });
}

export function trackPriceChange(vendorId: string, listingId: string, oldPrice: number, newPrice: number) {
  trackEvent("owner_price_changed", { vendorId, listingId, oldPrice, newPrice }, "vendor");
}

export function trackReferralShared(code: string, platform: string = "web") {
  trackEvent("referral_shared", { code, platform });
}
