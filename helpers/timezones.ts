import { getTimeZones, timeZonesNames, type TimeZone } from '@vvo/tzdb';

import { TimeZoneItem } from '../utils/types';

/** Convert IANA id to city name */
export function cityFromZoneId(id: string) {
  // Split the IANA id by '/' and take the last part
  // i.e. "America/New_York" -> "New_York"
  const last = id.split('/').pop() ?? id;
  return last.replace(/_/g, ' '); // Replace underscores with spaces
}

/** Current device zone id */
export function deviceZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Build "YYYY-MM-DD" for a given zone/date */
function dayKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  }).formatToParts(date);

  // helper to get part by type
  const get = (t: string) => parts.find(p => p.type === t)?.value!;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Exact UTC offset in minutes for a zone at a given Date (DST-aware) */
export function offsetMinutes(timeZone: string, date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const getNum = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const y = getNum('year');
  const m = getNum('month');
  const d = getNum('day');
  const hh = getNum('hour');
  const mm = getNum('minute');
  const ss = getNum('second');

  // UTC timestamp as if the local time were in UTC
  const utcAsIf = Date.UTC(y, m - 1, d, hh, mm, ss);

  // Return difference in minutes between that and actual UTC time
  return Math.round((utcAsIf - date.getTime()) / 60000);
}

/** Human label like "+3h", "−2h 30m" relative to device zone */
export function diffLabel(targetZone: string, date: Date = new Date()): string {
  const diff = offsetMinutes(targetZone, date) - offsetMinutes(deviceZone(), date);
  const sign = diff >= 0 ? '+' : '−';
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m ? `${sign}${h}h ${m}m` : `${sign}${h}h`;
}

/** Today/Tomorrow/Yesterday relative to device */
export function dayRelative(targetZone: string, date: Date = new Date()): 'Today' | 'Tomorrow' | 'Yesterday' {
  const device = dayKey(date, deviceZone());
  const target = dayKey(date, targetZone);
  if (target === device) return 'Today';

  const toNum = (k: string) => Number(k.replace(/-/g, '')); // e.g., "2024-06-15" -> 20240615
  const delta = toNum(target) - toNum(device);
  if (delta === 1) return 'Tomorrow';
  if (delta === -1) return 'Yesterday';
  return delta > 0 ? 'Tomorrow' : 'Yesterday';
}

/** Format "HH:mm" (switch to hour12: true if you prefer 12-hour) */
export function timeHHmm(targetZone: string, date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: targetZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** Get a list of zones; prefer built-in list, fall back to tzdb; enrich with country */
export function getAllZones(): TimeZoneItem[] {
  // Try the runtime list first
  let ids: string[] | undefined;

  // Get the supportedValuesOf function from Intl which returns an array
  // of either time zones, calendar, currency, etc.
  const supportedValuesOf = (Intl as any)?.supportedValuesOf as
    | ((key: string) => string[])
    | undefined; 

  // If supportedValuesOf is available, use it to get the list of time zones
  if (typeof supportedValuesOf === 'function') {
    try {
      ids = supportedValuesOf('timeZone');
    } catch {
      // ignore
    }
  }

  if (!ids) {
    // Fallback to tzdb's full list of IANA names
    ids = timeZonesNames;
  }

  // Enrich with tzdb metadata (countryName, etc.)
  const tzMeta = getTimeZones();
  // Map each timezone name to its metadata for quick lookup
  const enrich = new Map<string, TimeZone>(tzMeta.map((z) => [z.name, z]));

  // Build TimeZoneItem list
  const items: TimeZoneItem[] = ids.map((id) => {
    const meta = enrich.get(id);
    return {
      id,
      city: cityFromZoneId(id),
      country: meta?.countryName,
    };
  });

  // Sort in ascending order by city name
  items.sort((a: TimeZoneItem, b: TimeZoneItem) => a.city.localeCompare(b.city));
  return items;
}
