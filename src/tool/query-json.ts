// Pure, framework-free query-string <-> JSON conversion logic, plus generic
// query-string <-> key/value-pair parsing shared with the URL parser tab.
// Tool-specific.

import { percentDecode, percentEncode } from './percent-encoding';

export interface QueryPair {
  key: string;
  value: string;
}

/** Percent-decodes a single query key/value component leniently (falls back
 * to the raw text on a malformed escape, since this is used for live display
 * while the user is still typing). Query strings conventionally use '+' for
 * space (application/x-www-form-urlencoded). */
function decodeQueryComponent(raw: string): string {
  const result = percentDecode(raw, { preserveReserved: false, plusAsSpace: true });
  return result.ok ? result.value : raw;
}

/**
 * Parses a `key=value&key2=value2` query string into an ordered list of
 * pairs. Repeated keys each get their own entry (never collapsed here) so
 * both the URL parser tab and the query-string/JSON conversion below can
 * build on the same representation.
 */
export function parseQueryPairs(queryString: string): QueryPair[] {
  const trimmed = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  if (trimmed === '') return [];
  return trimmed
    .split('&')
    .filter((part) => part.length > 0)
    .map((part) => {
      const eqIndex = part.indexOf('=');
      const rawKey = eqIndex === -1 ? part : part.slice(0, eqIndex);
      const rawValue = eqIndex === -1 ? '' : part.slice(eqIndex + 1);
      return { key: decodeQueryComponent(rawKey), value: decodeQueryComponent(rawValue) };
    });
}

/** Serializes an ordered list of key/value pairs back into a query string. */
export function buildQueryString(pairs: QueryPair[]): string {
  return pairs
    .map(({ key, value }) => `${percentEncode(key, 'form')}=${percentEncode(value, 'form')}`)
    .join('&');
}

export type QueryJsonValue = string | string[];
export type QueryJsonObject = Record<string, QueryJsonValue>;

/** Collapses a list of pairs into an object, turning repeated keys into
 * arrays of values (in occurrence order). */
export function pairsToJsonObject(pairs: QueryPair[]): QueryJsonObject {
  const result: QueryJsonObject = {};
  for (const { key, value } of pairs) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      const existing = result[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        result[key] = [existing, value];
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

function stringifyScalar(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // Nested object/array inside an array item: stringify rather than lose data.
  return JSON.stringify(value);
}

export type JsonToPairsResult = { pairs: QueryPair[] } | { error: string };

/**
 * Expands a flat (or reasonably shallow) JSON object into an ordered list of
 * key/value pairs, turning each array value into one pair per element.
 */
export function jsonValueToPairs(json: unknown): JsonToPairsResult {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    return { error: 'Top-level JSON value must be an object, e.g. {"key": "value"}.' };
  }
  const pairs: QueryPair[] = [];
  for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        pairs.push({ key, value: stringifyScalar(item) });
      }
    } else {
      pairs.push({ key, value: stringifyScalar(value) });
    }
  }
  return { pairs };
}
