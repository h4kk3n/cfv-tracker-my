/**
 * Normalizes a Firestore Timestamp or string/number to an ISO string.
 * Firestore serverTimestamp() returns Timestamp objects with .seconds/.nanoseconds,
 * but our types declare strings. This helper bridges the gap at the service layer.
 */
export function normalizeTimestamp(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toISOString();
  // Firestore Timestamp object
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return new Date((value as { seconds: number }).seconds * 1000).toISOString();
  }
  // Date object
  if (value instanceof Date) return value.toISOString();
  return '';
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-MY', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-MY', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(new Date(timestamp).toISOString());
}

/**
 * Strips stray backslash-escape artifacts from display text.
 * CFA source data contains sequences like \#, \_, \/ in card names/effects.
 * These should render as their unescaped characters in the UI.
 */
export function sanitizeDisplayText(text: string): string {
  if (!text) return '';
  return text.replace(/\\([#*_\[\]\/\\>~`|])/g, '$1');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
