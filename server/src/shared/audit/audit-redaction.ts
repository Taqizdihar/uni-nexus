export const AUDIT_REDACTED = '[REDACTED]';

const MAX_DEPTH = 8;
const MAX_ARRAY_ITEMS = 100;
const MAX_OBJECT_KEYS = 100;
const MAX_STRING_LENGTH = 2_000;

// Deliberately broad: an Audit record is for historical evidence, never a
// transport for credentials. Normalising the key catches snake_case, camelCase
// and common punctuation variants without relying on an exhaustive list.
const sensitiveKey = (key: string) => /(?:password|passphrase|token|authorization|cookie|session(?:secret|token)?|jwt|secret|api(?:key|secret)?|credential|privatekey|clientsecret|accesstoken|refreshtoken)/i.test(key.replace(/[^a-z0-9]/gi, ''));

const trimText = (value: string) => value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…[TRUNCATED]` : value;

/** Redacts unsafe values and bounds arbitrary data before it reaches JSON storage. */
export const redactAuditValue = (value: unknown, depth = 0, seen = new WeakSet<object>()): unknown => {
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value ?? null;
  if (typeof value === 'string') return trimText(value);
  if (typeof value === 'bigint') return String(value);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (depth >= MAX_DEPTH) return '[TRUNCATED_DEPTH]';
  if (typeof value !== 'object') return trimText(String(value));
  if (seen.has(value as object)) return '[CIRCULAR]';
  seen.add(value as object);

  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_ITEMS).map(item => redactAuditValue(item, depth + 1, seen));

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, MAX_OBJECT_KEYS)) {
    result[key] = sensitiveKey(key) ? AUDIT_REDACTED : redactAuditValue(item, depth + 1, seen);
  }
  return result;
};

/** Parses a legacy JSON column safely, then applies the same redaction used on new writes. */
export const parseAndRedactAuditJson = (raw: unknown): unknown => {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'string') {
    try { return redactAuditValue(JSON.parse(raw)); }
    catch { return redactAuditValue(raw); }
  }
  return redactAuditValue(raw);
};

/** Keeps descriptions useful without allowing obvious inline secret values through. */
export const redactAuditDescription = (value: string | null | undefined) => {
  if (!value) return null;
  return trimText(value)
    .replace(/\b(Bearer)\s+[A-Za-z0-9._~+/=-]+/gi, `$1 ${AUDIT_REDACTED}`)
    .replace(/\b(password|passphrase|token|authorization|cookie|api[_-]?key|secret|credential)\s*[:=]\s*([^\s,;]+)/gi, `$1=${AUDIT_REDACTED}`);
};

