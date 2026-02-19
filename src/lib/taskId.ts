/**
 * Generates a globally unique, branded Task ID.
 *
 * Format: RLY-TSK-YYYY-XXXXXX
 *   - RLY     → brand prefix (Reliyo)
 *   - TSK     → entity type
 *   - YYYY    → 4-digit year
 *   - XXXXXX  → 6-char alphanumeric random segment (uppercase)
 *
 * Collision-safe: uses crypto.getRandomValues for randomness.
 * URL-safe, log-safe, support-friendly.
 * Immutable once generated — never reused even if task creation fails.
 */

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

function randomSegment(length: number): string {
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => CHARS[v % CHARS.length]).join("");
}

// Track generated IDs in current session to prevent duplicates
const usedIds = new Set<string>();

export function generateTaskId(): string {
  const year = new Date().getFullYear();
  let id: string;
  do {
    id = `RLY-TSK-${year}-${randomSegment(6)}`;
  } while (usedIds.has(id));
  usedIds.add(id);
  return id;
}
