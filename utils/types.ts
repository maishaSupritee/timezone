export type TimeZoneItem = {
  id: string;          // IANA ID, e.g., "Asia/Tokyo"
  city: string;        // "Tokyo"
  country?: string;    // e.g., "Japan" (when tzdb present)
};

export type SavedIanaIds = string[]; // array of IANA ids (e.g., ["Asia/Tokyo", "Europe/London"])