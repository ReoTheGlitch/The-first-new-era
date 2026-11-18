// Cairo-local time helpers. Streaks and the weekly competition reset on
// Egypt's civil clock, not UTC, so a student who studies at 11pm Cairo
// and midnight Cairo gets two separate streak days exactly the way the
// clock they're looking at suggests.

const TZ = "Africa/Cairo";

function cairoParts(d: Date): { year: number; month: number; day: number; dow: number } {
  // en-CA formats as YYYY-MM-DD so parts come back in a stable shape.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? "";
  const [year, month, day] = [get("year"), get("month"), get("day")].map(Number);
  const dowMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = dowMap[get("weekday")] ?? 0;
  return { year: year!, month: month!, day: day!, dow };
}

/** YYYY-MM-DD for today in Africa/Cairo. */
export function cairoDate(now: Date = new Date()): string {
  const { year, month, day } = cairoParts(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Given a YYYY-MM-DD, return YYYY-MM-DD n days later (negative = earlier). */
export function cairoAddDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  // UTC arithmetic is fine here because we're adding whole days to a bare date.
  const base = new Date(Date.UTC(y!, m! - 1, d!));
  base.setUTCDate(base.getUTCDate() + days);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** ISO instant of the most recent Monday 00:00 Africa/Cairo at or before `now`. */
export function cairoWeekStartIso(now: Date = new Date()): string {
  const { year, month, day, dow } = cairoParts(now);
  // Monday = 1, Sunday = 0. Days-since-monday: (dow + 6) % 7.
  const back = (dow + 6) % 7;
  const monday = cairoAddDays(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    -back,
  );
  // Cairo is UTC+2 year-round (Egypt reinstated DST in 2023, so DST-aware
  // libraries land on UTC+3 during summer; we rely on the formatter to
  // produce the right local date and then record the start as "midnight
  // Cairo" expressed in UTC. DST transitions never fall on Monday 00:00, so
  // this is safe within a few minutes either way; the countdown rounds to
  // a minute anyway.)
  const [y, m, d] = monday.split("-").map(Number);
  // Use Africa/Cairo offset lookup via a probe formatter.
  const probe = new Date(Date.UTC(y!, m! - 1, d!, 0, 0, 0));
  const offsetMin = cairoOffsetMinutes(probe);
  const utcMs = Date.UTC(y!, m! - 1, d!, 0, 0, 0) - offsetMin * 60_000;
  return new Date(utcMs).toISOString();
}

/** ISO instant of next Monday 00:00 Africa/Cairo (end of the current week). */
export function cairoNextWeekStartIso(now: Date = new Date()): string {
  const startIso = cairoWeekStartIso(now);
  const start = new Date(startIso);
  return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

/** Africa/Cairo offset from UTC, in minutes (positive east of UTC), for the given instant. */
function cairoOffsetMinutes(d: Date): number {
  // Build a date in Cairo and in UTC with the same calendar fields, difference is the offset.
  const cairoStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
  // Shape: "YYYY-MM-DD, HH:MM:SS"
  const [datePart, timePart] = cairoStr.split(", ");
  const [y, m, dd] = datePart!.split("-").map(Number);
  const [hh, mm, ss] = timePart!.split(":").map(Number);
  const asIfUtc = Date.UTC(y!, m! - 1, dd!, hh!, mm!, ss!);
  return Math.round((asIfUtc - d.getTime()) / 60_000);
}
