/**
 * Timezone-aware day helpers.
 *
 * Motivation: this product serves users in Bangladesh (UTC+6). When the
 * server ran on UTC, `setHours(0,0,0,0)` on `new Date()` and
 * `timestamp.toISOString().slice(0,10)` both produced UTC-based day keys.
 * That caused:
 *   - meals logged between 00:00–06:00 Dhaka to fall into the *previous* UTC
 *     day in the dashboard and daily-summary upsert,
 *   - weekly chart buckets drifting by one row near midnight local time.
 *
 * Every day key in this file is a "YYYY-MM-DD" string that represents a
 * calendar date in the target timezone. Every `Date` returned is a UTC
 * instant corresponding to an exact local-midnight boundary.
 */

export const DEFAULT_TZ = "Asia/Dhaka"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

/** Returns YYYY-MM-DD for the given instant in the given timezone. */
export function tzDateKey(d: Date, timeZone: string = DEFAULT_TZ): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d)
  const y = parts.find((p) => p.type === "year")!.value
  const m = parts.find((p) => p.type === "month")!.value
  const day = parts.find((p) => p.type === "day")!.value
  return `${y}-${m}-${day}`
}

/**
 * How many ms ahead of UTC the given timezone is at the given instant.
 * Dhaka → +6h = +21_600_000. Returns 0 for UTC. Works with DST zones too
 * because we probe the offset at that specific instant.
 */
function tzOffsetMs(d: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const parts: Record<string, string> = {}
  for (const p of dtf.formatToParts(d)) {
    if (p.type !== "literal") parts[p.type] = p.value
  }
  // Intl may emit "24" for midnight on some platforms.
  const hour = parts.hour === "24" ? "00" : parts.hour
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return asIfUtc - d.getTime()
}

/** UTC Date corresponding to 00:00:00.000 local-time of the given YYYY-MM-DD. */
export function tzDayStart(dateKey: string, timeZone: string = DEFAULT_TZ): Date {
  const [y, m, d] = dateKey.split("-").map(Number)
  const naiveUtc = Date.UTC(y, m - 1, d)
  const offset = tzOffsetMs(new Date(naiveUtc), timeZone)
  // Local midnight = naive UTC of date − offset
  return new Date(naiveUtc - offset)
}

/** UTC Date corresponding to 23:59:59.999 local-time of the given YYYY-MM-DD. */
export function tzDayEnd(dateKey: string, timeZone: string = DEFAULT_TZ): Date {
  return new Date(tzDayStart(dateKey, timeZone).getTime() + 24 * 3600 * 1000 - 1)
}

/** YYYY-MM-DD for "today" in the given timezone. */
export function tzToday(timeZone: string = DEFAULT_TZ): string {
  return tzDateKey(new Date(), timeZone)
}

/** Hour-of-day (0-23) for the given instant in the target timezone. */
export function tzLocalHour(d: Date = new Date(), timeZone: string = DEFAULT_TZ): number {
  const part = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  })
    .formatToParts(d)
    .find((p) => p.type === "hour")?.value
  // Intl can emit "24" for midnight in some locales → normalize to 0.
  const h = Number(part ?? "0")
  return h === 24 ? 0 : h
}

/** Pure calendar arithmetic on a YYYY-MM-DD key, timezone-independent. */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number)
  const shifted = new Date(Date.UTC(y, m - 1, d + days))
  const yy = shifted.getUTCFullYear()
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(shifted.getUTCDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}

/** Three-letter day-of-week label for a YYYY-MM-DD key (Sun..Sat). */
export function dayOfWeekLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number)
  return DAY_LABELS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}
