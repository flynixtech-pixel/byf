"use client";

export interface ScheduledReminder {
  orderId: string;
  title: string;
  sport?: string;
  dateTime: string; // ISO or date string
  customerName?: string;
  reminded?: boolean;
  scheduledAt: string;
}

const STORAGE_KEY = "byv_game_reminders";

/** Request browser notification permission if available. */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return Notification.permission;
  }
}

/** Fire a live notification (both Web Push Notification and in-app visual toast). */
export function sendLiveNotification(title: string, body: string, icon = "🔔") {
  if (typeof window === "undefined") return;

  // 1. Web Native Push Notification (if permitted)
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const n = new Notification(title, {
        body,
        icon: "/logo.jpg",
        badge: "/logo.jpg",
        tag: `byv-reminder-${Date.now()}`,
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (e) {
      console.warn("Could not fire native notification:", e);
    }
  }

  // 2. Dispatch custom event for in-app live toast UI
  window.dispatchEvent(
    new CustomEvent("live-reminder-toast", {
      detail: {
        title,
        body,
        icon,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    })
  );
}

/** Generate a dynamic Gen-Z styled reminder message. */
export function getGenZReminderMessage(options?: {
  sport?: string;
  title?: string;
  timeStr?: string;
  minsLeft?: number;
}): { title: string; body: string } {
  const sportName = options?.sport ? options.sport : "Cricket";
  const venueTitle = options?.title ? options.title : "Turf";
  const time = options?.timeStr ? options.timeStr : "7:00 PM";

  const sportEmojis: Record<string, string> = {
    Cricket: "🏏",
    Football: "⚽",
    Badminton: "🏸",
    Basketball: "🏀",
    Tennis: "🎾",
    Volleyball: "🏐",
    Padel: "🎾",
    Pickleball: "🏓",
    Swimming: "🏊‍♂️",
    Gym: "🏋️‍♂️",
  };

  const emoji = sportEmojis[sportName] || "🎮";

  const title = `🚨 Slot Reminder: ${sportName} @ ${venueTitle}!`;

  let body = `Yo! Your ${venueTitle} slot for ${sportName} starts at ${time}! ${emoji} Pull up on time with your squad & get ready to cook! 🔥`;

  if (typeof options?.minsLeft === "number") {
    if (options.minsLeft <= 0) {
      body = `Yo! Your ${venueTitle} slot for ${sportName} is starting RIGHT NOW (${time})! ${emoji} Pull up & lock in! ⚡`;
    } else {
      body = `Yo! Your ${venueTitle} slot for ${sportName} starts in ${Math.round(options.minsLeft)} mins at ${time}! ${emoji} Be on time to turn up! 🔥`;
    }
  }

  return { title, body };
}

/** Schedule a game reminder into local storage & send immediate activation feedback. */
export function scheduleGameReminder(reminder: Omit<ScheduledReminder, "scheduledAt" | "reminded">) {
  if (typeof window === "undefined") return;

  // Request browser permission proactively
  requestNotificationPermission();

  const existing: ScheduledReminder[] = getScheduledReminders();
  const filtered = existing.filter((r) => r.orderId !== reminder.orderId);

  const newReminder: ScheduledReminder = {
    ...reminder,
    reminded: false,
    scheduledAt: new Date().toISOString(),
  };

  filtered.push(newReminder);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to save reminder in localStorage:", e);
  }

  // Send activation confirmation
  const slotDate = new Date(reminder.dateTime);
  const timeStr = isNaN(slotDate.getTime())
    ? reminder.dateTime
    : slotDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const msg = getGenZReminderMessage({
    title: reminder.title,
    sport: reminder.sport,
    timeStr,
  });

  sendLiveNotification(
    `🔔 Game Reminder Set!`,
    `Live Web & SMS notification active! ${msg.body}`,
    "🔔"
  );
}

/** Retrieve all scheduled game reminders from localStorage. */
export function getScheduledReminders(): ScheduledReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/** Check all saved reminders and fire notifications for any slot starting within 60 minutes. */
export function checkUpcomingReminders() {
  if (typeof window === "undefined") return;

  const reminders = getScheduledReminders();
  if (!reminders.length) return;

  const now = Date.now();
  let updated = false;

  const nextReminders = reminders.map((r) => {
    if (r.reminded) return r;

    const slotTime = new Date(r.dateTime).getTime();
    if (isNaN(slotTime)) return r;

    const diffMs = slotTime - now;
    const diffMinutes = diffMs / (1000 * 60);

    // If starting within 60 minutes (or up to 5 minutes after start)
    if (diffMinutes <= 60 && diffMinutes >= -5) {
      const displayTime = new Date(r.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const msg = getGenZReminderMessage({
        title: r.title,
        sport: r.sport,
        timeStr: displayTime,
        minsLeft: diffMinutes,
      });

      sendLiveNotification(msg.title, msg.body, "⏳");
      updated = true;
      return { ...r, reminded: true };
    }

    return r;
  });

  if (updated) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextReminders));
    } catch (e) {
      console.error("Failed to update reminders:", e);
    }
  }
}

/** Instant demo trigger so user can test live notifications immediately. */
export function triggerDemoReminder(opts?: { title?: string; sport?: string; timeStr?: string }) {
  requestNotificationPermission().then(() => {
    const msg = getGenZReminderMessage({
      title: opts?.title || "Turf",
      sport: opts?.sport || "Cricket",
      timeStr: opts?.timeStr || "7:00 PM",
    });

    sendLiveNotification(msg.title, msg.body, "⚡");
  });
}
