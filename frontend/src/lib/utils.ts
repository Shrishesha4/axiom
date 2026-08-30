import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** App display timezone — IST (UTC+5:30). */
export const APP_TIMEZONE = "Asia/Kolkata"

/** Parse API timestamps; naive ISO strings from the backend are UTC. */
export function parseApiDate(iso: string): Date {
  if (!iso) return new Date(NaN)
  const trimmed = iso.trim()

  // Legacy trace rows: "HH:MM:SS" stored as UTC
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    const todayKey = dayKeyInTimezone(new Date(), APP_TIMEZONE)
    return new Date(`${todayKey}T${trimmed}Z`)
  }

  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed)
  }
  return new Date(`${trimmed}Z`)
}

function dayKeyInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function timeInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date)
}

function yesterdayKeyInTimezone(now: Date, timeZone: string): string {
  return dayKeyInTimezone(new Date(now.getTime() - 86_400_000), timeZone)
}

/** Session / investigation created_at — relative when very recent, otherwise IST date + time. */
export function formatRelativeTime(iso: string): string {
  return formatSessionTimestamp(iso)
}

export function formatSessionTimestamp(iso: string, now = new Date()): string {
  const date = parseApiDate(iso)
  if (Number.isNaN(date.getTime())) return iso

  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)

  if (diffMins >= 0 && diffMins < 1) return "Just now"
  if (diffMins >= 0 && diffMins < 60) return `${diffMins}m ago`

  const dateKey = dayKeyInTimezone(date, APP_TIMEZONE)
  const todayKey = dayKeyInTimezone(now, APP_TIMEZONE)
  const time = timeInTimezone(date, APP_TIMEZONE)

  if (dateKey === todayKey) return `Today, ${time}`

  if (dateKey === yesterdayKeyInTimezone(now, APP_TIMEZONE)) {
    return `Yesterday, ${time}`
  }

  const sameYear = dateKey.slice(0, 4) === todayKey.slice(0, 4)
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date)
}

export function formatDayLabel(iso: string, now = new Date()): string {
  const date = parseApiDate(iso)
  const dateKey = dayKeyInTimezone(date, APP_TIMEZONE)
  const todayKey = dayKeyInTimezone(now, APP_TIMEZONE)

  if (dateKey === todayKey) return "Today"
  if (dateKey === yesterdayKeyInTimezone(now, APP_TIMEZONE)) return "Yesterday"

  const sameYear = dateKey.slice(0, 4) === todayKey.slice(0, 4)
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: APP_TIMEZONE,
    ...(sameYear
      ? { weekday: "short", month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" }),
  }).format(date)
}

export function getSessionDayKey(iso: string): string {
  return dayKeyInTimezone(parseApiDate(iso), APP_TIMEZONE)
}

export function formatDateOnly(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: APP_TIMEZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseApiDate(iso))
}

/** Agent trace step time in IST. */
export function formatTraceTimestamp(value?: string): string {
  if (!value) return ""
  const date = parseApiDate(value)
  if (Number.isNaN(date.getTime())) return value
  return timeInTimezone(date, APP_TIMEZONE)
}
