const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T/;

const toSnakeCase = (key: string) =>
  key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const toCamelCase = (key: string) =>
  key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());

/**
 * Rows are flat (a handful of primitive/array/jsonb/Date fields per entity,
 * no nesting) so a shallow key + Date conversion is enough — no need for a
 * general-purpose deep (de)serializer.
 */
export function toSupabaseRow(
  data: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    result[toSnakeCase(key)] = value instanceof Date ? value.toISOString() : value;
  }
  return result;
}

export function fromSupabaseRow<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[toCamelCase(key)] =
      typeof value === "string" && ISO_TIMESTAMP_RE.test(value)
        ? new Date(value)
        : value;
  }
  return result as T;
}
