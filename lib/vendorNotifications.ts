/**
 * Shared "read" state for vendor notifications (turf bookings + coach enrolments), keyed
 * by orderId so it's one flat set regardless of vertical. Read by both the Notifications
 * pages (mark a row / "mark all read") and BottomNav (unread count badge) — landing on
 * the Notifications screen must NOT mark everything read on its own; only actually
 * opening/acknowledging a notification (or explicit "mark all read") should.
 */
const READ_IDS_KEY = "byv_vendor_read_notification_ids";

export function getReadNotificationIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(READ_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveReadNotificationIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage unavailable — read state just won't persist across a reload.
  }
}
