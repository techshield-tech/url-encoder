// Pure, framework-free URL component parsing/building, plus punycode/IDN
// host decoding. Tool-specific.

import type { QueryPair } from './query-json';
import { parseQueryPairs, buildQueryString } from './query-json';

export interface ParsedUrl {
  /** Scheme without the trailing colon, e.g. "https". Empty if none. */
  protocol: string;
  username: string;
  password: string;
  /** Hostname without port. For IPv6 literals this includes the brackets, e.g. "[::1]". */
  hostname: string;
  port: string;
  pathname: string;
  query: QueryPair[];
  /** Fragment without the leading '#'. */
  hash: string;
  /** Whether a "//authority" section was present at all. */
  hasAuthority: boolean;
}

/**
 * Splits a URL string into its components by hand (scheme, authority,
 * userinfo, host, port, path, query, fragment) following the generic URI
 * syntax (RFC 3986 §3). This never throws: any string, however malformed,
 * is parsed on a best-effort basis.
 */
export function parseUrl(raw: string): ParsedUrl {
  let rest = raw;
  let protocol = '';
  let hash = '';
  let queryString = '';
  let hasAuthority = false;
  let username = '';
  let password = '';
  let hostname = '';
  let port = '';
  let pathname = '';

  const hashIndex = rest.indexOf('#');
  if (hashIndex !== -1) {
    hash = rest.slice(hashIndex + 1);
    rest = rest.slice(0, hashIndex);
  }

  const queryIndex = rest.indexOf('?');
  if (queryIndex !== -1) {
    queryString = rest.slice(queryIndex + 1);
    rest = rest.slice(0, queryIndex);
  }

  const schemeMatch = rest.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (schemeMatch) {
    protocol = schemeMatch[1];
    rest = rest.slice(schemeMatch[0].length);
  }

  if (rest.startsWith('//')) {
    hasAuthority = true;
    rest = rest.slice(2);
    const pathStart = rest.indexOf('/');
    const authority = pathStart === -1 ? rest : rest.slice(0, pathStart);
    pathname = pathStart === -1 ? '' : rest.slice(pathStart);

    const atIndex = authority.lastIndexOf('@');
    let hostPort = authority;
    if (atIndex !== -1) {
      const userinfo = authority.slice(0, atIndex);
      hostPort = authority.slice(atIndex + 1);
      const colonIndex = userinfo.indexOf(':');
      if (colonIndex !== -1) {
        username = userinfo.slice(0, colonIndex);
        password = userinfo.slice(colonIndex + 1);
      } else {
        username = userinfo;
      }
    }

    if (hostPort.startsWith('[')) {
      const closeIndex = hostPort.indexOf(']');
      if (closeIndex !== -1) {
        hostname = hostPort.slice(0, closeIndex + 1);
        const afterBracket = hostPort.slice(closeIndex + 1);
        if (afterBracket.startsWith(':')) {
          port = afterBracket.slice(1);
        }
      } else {
        hostname = hostPort;
      }
    } else {
      const colonIndex = hostPort.indexOf(':');
      if (colonIndex !== -1) {
        hostname = hostPort.slice(0, colonIndex);
        port = hostPort.slice(colonIndex + 1);
      } else {
        hostname = hostPort;
      }
    }
  } else {
    pathname = rest;
  }

  return {
    protocol,
    username,
    password,
    hostname,
    port,
    pathname,
    query: parseQueryPairs(queryString),
    hash,
    hasAuthority,
  };
}

export interface BuildUrlInput {
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: string;
  pathname: string;
  query: QueryPair[];
  hash: string;
  hasAuthority: boolean;
}

/** Rebuilds a URL string from parsed (and possibly edited) components. */
export function buildUrl(input: BuildUrlInput): string {
  let result = '';
  if (input.protocol) {
    result += `${input.protocol}:`;
  }
  if (input.hasAuthority) {
    result += '//';
    if (input.username || input.password) {
      result += input.username;
      if (input.password) result += `:${input.password}`;
      result += '@';
    }
    result += input.hostname;
    if (input.port) result += `:${input.port}`;
  }
  result += input.pathname;
  const queryString = buildQueryString(input.query);
  if (queryString) result += `?${queryString}`;
  if (input.hash) result += `#${input.hash}`;
  return result;
}

// --- Punycode / IDN host decoding -----------------------------------------
//
// There is no browser API that decodes an ASCII "xn--..." punycode label
// back to Unicode, so that direction is hand-implemented below (Bootstring /
// RFC 3492, the algorithm IDNA punycode is built on). The reverse direction
// (Unicode host -> ASCII/punycode "xn--..." form) IS available for free via
// the browser's own URL parser (which performs ToASCII on the hostname), so
// we reuse that instead of reimplementing IDNA/nameprep ourselves.

const PUNY_BASE = 36;
const PUNY_TMIN = 1;
const PUNY_TMAX = 26;
const PUNY_SKEW = 38;
const PUNY_DAMP = 700;
const PUNY_INITIAL_BIAS = 72;
const PUNY_INITIAL_N = 128;
const PUNY_DELIMITER = '-';

function punycodeAdapt(delta: number, numPoints: number, firstTime: boolean): number {
  let d = firstTime ? Math.floor(delta / PUNY_DAMP) : Math.floor(delta / 2);
  d += Math.floor(d / numPoints);
  let k = 0;
  while (d > ((PUNY_BASE - PUNY_TMIN) * PUNY_TMAX) >> 1) {
    d = Math.floor(d / (PUNY_BASE - PUNY_TMIN));
    k += PUNY_BASE;
  }
  return Math.floor(k + ((PUNY_BASE - PUNY_TMIN + 1) * d) / (d + PUNY_SKEW));
}

function punycodeBasicToDigit(codePoint: number): number {
  if (codePoint >= 0x30 && codePoint <= 0x39) return codePoint - 0x30 + 26; // '0'-'9'
  if (codePoint >= 0x41 && codePoint <= 0x5a) return codePoint - 0x41; // 'A'-'Z'
  if (codePoint >= 0x61 && codePoint <= 0x7a) return codePoint - 0x61; // 'a'-'z'
  return PUNY_BASE; // not a valid base-36 digit
}

/** Decodes a single punycode label (without its "xn--" prefix). Throws on malformed input. */
function punycodeDecode(input: string): string {
  const output: number[] = [];
  let n = PUNY_INITIAL_N;
  let i = 0;
  let bias = PUNY_INITIAL_BIAS;

  const lastDelimiter = input.lastIndexOf(PUNY_DELIMITER);
  const basicLength = lastDelimiter > 0 ? lastDelimiter : 0;
  for (let j = 0; j < basicLength; j++) {
    output.push(input.charCodeAt(j));
  }

  let index = lastDelimiter > 0 ? basicLength + 1 : 0;
  const inputLength = input.length;

  while (index < inputLength) {
    const oldi = i;
    let w = 1;
    let k = PUNY_BASE;
    for (;;) {
      if (index >= inputLength) throw new Error('Invalid punycode input: unexpected end');
      const digit = punycodeBasicToDigit(input.charCodeAt(index++));
      if (digit >= PUNY_BASE) throw new Error('Invalid punycode digit');
      if (digit > Math.floor((0x7fffffff - i) / w)) throw new Error('Punycode overflow');
      i += digit * w;
      const t = k <= bias ? PUNY_TMIN : k >= bias + PUNY_TMAX ? PUNY_TMAX : k - bias;
      if (digit < t) break;
      if (w > Math.floor(0x7fffffff / (PUNY_BASE - t))) throw new Error('Punycode overflow');
      w *= PUNY_BASE - t;
      k += PUNY_BASE;
    }
    const outLength = output.length + 1;
    bias = punycodeAdapt(i - oldi, outLength, oldi === 0);
    if (Math.floor(i / outLength) > 0x7fffffff - n) throw new Error('Punycode overflow');
    n += Math.floor(i / outLength);
    i %= outLength;
    output.splice(i, 0, n);
    i += 1;
  }

  return String.fromCodePoint(...output);
}

/**
 * Decodes an IDN host's punycode labels ("xn--...") back to Unicode.
 * Returns null if the host has no punycode labels, or if decoding fails.
 */
export function decodePunycodeHost(host: string): string | null {
  if (!host) return null;
  const hasPunycodeLabel = host.split('.').some((label) => /^xn--/i.test(label));
  if (!hasPunycodeLabel) return null;
  try {
    return host
      .split('.')
      .map((label) => (/^xn--/i.test(label) ? punycodeDecode(label.slice(4)) : label))
      .join('.');
  } catch {
    return null;
  }
}

/**
 * Encodes a Unicode (non-ASCII) host to its ASCII/punycode form, via the
 * browser's own URL parser (which performs ToASCII on the hostname it is
 * given). Returns null if the host is already ASCII, or encoding fails.
 */
export function encodePunycodeHost(host: string): string | null {
  if (!host || !/[^\x00-\x7f]/.test(host)) return null;
  try {
    const url = new URL(`http://${host}/`);
    return url.hostname || null;
  } catch {
    return null;
  }
}

export interface IdnInfo {
  /** The ASCII/punycode ("xn--...") form of the host, if determinable. */
  ascii: string | null;
  /** The decoded Unicode form of the host, if determinable. */
  unicode: string | null;
}

/**
 * Returns both the ASCII/punycode and Unicode forms of `hostname` when it is
 * an IDN (punycode) host or already contains non-ASCII characters. Returns
 * null when the host is plain ASCII with no punycode labels (nothing to show).
 */
export function getIdnInfo(hostname: string): IdnInfo | null {
  if (!hostname) return null;
  const hasNonAscii = /[^\x00-\x7f]/.test(hostname);
  const hasPunycodeLabel = hostname.split('.').some((label) => /^xn--/i.test(label));
  if (!hasNonAscii && !hasPunycodeLabel) return null;

  if (hasPunycodeLabel) {
    const decoded = decodePunycodeHost(hostname);
    return { ascii: hostname, unicode: decoded };
  }

  const encoded = encodePunycodeHost(hostname);
  return { ascii: encoded, unicode: hostname };
}
