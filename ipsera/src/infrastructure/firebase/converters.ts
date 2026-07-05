import { Timestamp } from "firebase/firestore";

/**
 * Firestore documents are flat (a handful of primitive/array/Date fields per
 * entity, no nested Dates) so a shallow walk is enough here — no need for a
 * general-purpose deep converter.
 */
export function toFirestoreData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    result[key] = value instanceof Date ? Timestamp.fromDate(value) : value;
  }
  return result;
}

export function fromFirestoreData<T>(
  id: string,
  ownerId: string,
  raw: Record<string, unknown>
): T {
  const result: Record<string, unknown> = { id, ownerId };
  for (const [key, value] of Object.entries(raw)) {
    result[key] = value instanceof Timestamp ? value.toDate() : value;
  }
  return result as T;
}
