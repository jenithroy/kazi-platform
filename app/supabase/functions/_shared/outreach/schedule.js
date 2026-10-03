// When outreach email may go out: each sequence's sending hours (in its own time zone) and
// each mailbox's daily limit, warm-up and spacing. Shared by the worker and /admin.
//
// Plain JavaScript with no imports, so Deno and Next can both load it.

const WEEKDAYS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatters = new Map();

function formatter(timeZone) {
  let format = formatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, format);
  }
  return format;
}

/** The wall-clock date and time at `date` in `timeZone`; weekday is ISO (1 = Monday). */
export function zonedParts(date, timeZone) {
  const parts = {};
  for (const part of formatter(timeZone).formatToParts(date)) parts[part.type] = part.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS[parts.weekday],
  };
}

function offsetMs(date, timeZone) {
  const p = zonedParts(date, timeZone);
  const wallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallClockAsUtc - (date.getTime() - date.getUTCMilliseconds());
}

/** The instant a wall-clock time happens in `timeZone` (twice over to settle DST changes). */
export function zonedTimeToDate({ year, month, day, hour, minute }, timeZone) {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const first = asUtc - offsetMs(new Date(asUtc), timeZone);
  return new Date(asUtc - offsetMs(new Date(first), timeZone));
}

export function timeToMinutes(value) {
  const [hours, minutes] = String(value ?? "").split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function isValidTimeZone(timeZone) {
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** Whether `date` falls inside a sequence's sending hours: { timezone, send_days, send_from, send_until }. */
export function isWithinWindow(date, window) {
  const now = zonedParts(date, window.timezone);
  if (!window.send_days.map(Number).includes(now.weekday)) return false;
  const minutes = now.hour * 60 + now.minute;
  return minutes >= timeToMinutes(window.send_from) && minutes < timeToMinutes(window.send_until);
}

/** The first moment at or after `date` that's inside the sending hours (null if there's none). */
export function nextWindowStart(date, window) {
  if (isWithinWindow(date, window)) return date;
  const days = window.send_days.map(Number);
  const start = timeToMinutes(window.send_from);
  const today = zonedParts(date, window.timezone);
  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(Date.UTC(today.year, today.month - 1, today.day + offset));
    const weekday = ((day.getUTCDay() + 6) % 7) + 1;
    if (!days.includes(weekday)) continue;
    const opening = zonedTimeToDate(
      {
        year: day.getUTCFullYear(),
        month: day.getUTCMonth() + 1,
        day: day.getUTCDate(),
        hour: Math.floor(start / 60),
        minute: start % 60,
      },
      window.timezone,
    );
    if (opening.getTime() > date.getTime()) return opening;
  }
  return null;
}

/** "Mon–Fri" / "Mon, Wed, Fri" / "Every day". */
export function describeDays(sendDays) {
  const days = [...new Set(sendDays.map(Number))].sort((a, b) => a - b);
  if (days.length === 7) return "Every day";
  const runs = [];
  for (const day of days) {
    const last = runs.at(-1);
    if (last && day === last[1] + 1) last[1] = day;
    else runs.push([day, day]);
  }
  return runs
    .map(([from, to]) =>
      from === to
        ? WEEKDAY_LABELS[from - 1]
        : to === from + 1
          ? `${WEEKDAY_LABELS[from - 1]}, ${WEEKDAY_LABELS[to - 1]}`
          : `${WEEKDAY_LABELS[from - 1]}–${WEEKDAY_LABELS[to - 1]}`,
    )
    .join(", ");
}

/** "Mon–Fri, 09:00–17:00 (Europe/London)". */
export function describeWindow(window) {
  const time = (value) => String(value ?? "").slice(0, 5);
  return `${describeDays(window.send_days)}, ${time(window.send_from)}–${time(window.send_until)} (${window.timezone})`;
}

/** Today's allowance for a mailbox, counting warm-up from when it started. */
export function effectiveDailyLimit(mailbox, now = Date.now()) {
  if (!mailbox.warmup_enabled) return mailbox.daily_limit;
  const days = Math.max(0, Math.floor((now - new Date(mailbox.warmup_started_at).getTime()) / 86_400_000));
  return Math.min(mailbox.daily_limit, mailbox.warmup_start + days * mailbox.warmup_increment);
}

/** Seconds to wait after a send: random between the mailbox's minimum and maximum gap. */
export function randomGapSeconds(mailbox, random = Math.random) {
  const min = mailbox.min_gap_seconds;
  const max = Math.max(min, mailbox.max_gap_seconds);
  return Math.round(min + random() * (max - min));
}
