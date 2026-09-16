// Pure, framework-free percent-encoding logic. Tool-specific.
//
// Implements five encode/decode modes by hand (no reliance on
// encodeURIComponent/decodeURI and friends), so behaviour, UTF-8 handling,
// and error reporting are all fully under our control:
//
//  - component: same unreserved set as encodeURIComponent/decodeURIComponent.
//  - uri:       same unreserved set as encodeURI/decodeURI (also leaves the
//               reserved URI characters un-encoded, and decodeURI-style
//               decoding leaves escapes that WOULD decode to one of those
//               reserved characters untouched).
//  - form:      application/x-www-form-urlencoded (space <-> '+').
//  - rfc3986:   RFC 3986 "unreserved" set only (component's set minus the
//               sub-delim-ish extras JS leaves alone: ! ' ( ) *).
//  - full:      every byte is percent-encoded, no exceptions.

export type EncodeMode = 'component' | 'uri' | 'form' | 'rfc3986' | 'full';

export interface EncodeModeOption {
  value: EncodeMode;
  label: string;
}

export const ENCODE_MODE_OPTIONS: EncodeModeOption[] = [
  { value: 'component', label: 'encodeURIComponent / decodeURIComponent' },
  { value: 'uri', label: 'encodeURI / decodeURI' },
  { value: 'form', label: 'application/x-www-form-urlencoded' },
  { value: 'rfc3986', label: 'RFC 3986 strict (unreserved only)' },
  { value: 'full', label: 'Full percent-encode (every byte)' },
];

const ALPHA_NUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const COMPONENT_EXTRA = "-_.!~*'()";
const URI_EXTRA = ";/?:@&=+$,#";
const FORM_EXTRA = '-_.*';
const RFC3986_EXTRA = '-_.~';

function safeSetFor(mode: EncodeMode): Set<string> {
  switch (mode) {
    case 'component':
      return new Set(ALPHA_NUM + COMPONENT_EXTRA);
    case 'uri':
      return new Set(ALPHA_NUM + COMPONENT_EXTRA + URI_EXTRA);
    case 'form':
      return new Set(ALPHA_NUM + FORM_EXTRA);
    case 'rfc3986':
      return new Set(ALPHA_NUM + RFC3986_EXTRA);
    case 'full':
      return new Set();
  }
}

/** Percent-encodes `input` (UTF-8 byte-wise) according to `mode`. Never throws. */
export function percentEncode(input: string, mode: EncodeMode): string {
  const safe = safeSetFor(mode);
  const spaceAsPlus = mode === 'form';
  const bytes = new TextEncoder().encode(input);
  let out = '';
  for (const byte of bytes) {
    if (spaceAsPlus && byte === 0x20) {
      out += '+';
      continue;
    }
    if (byte < 0x80) {
      const char = String.fromCharCode(byte);
      if (safe.has(char)) {
        out += char;
        continue;
      }
    }
    out += '%' + byte.toString(16).toUpperCase().padStart(2, '0');
  }
  return out;
}

/** Encodes `input` line-by-line (batch mode). Each line is encoded independently. */
export function percentEncodeLines(input: string, mode: EncodeMode): string {
  return input
    .split('\n')
    .map((line) => percentEncode(line, mode))
    .join('\n');
}

export interface DecodeError {
  message: string;
  /** 0-based index into the decoded input string where decoding failed. */
  position: number;
}

export type DecodeOutcome = { ok: true; value: string } | { ok: false; error: DecodeError };

const URI_RESERVED = new Set([';', '/', '?', ':', '@', '&', '=', '+', '$', ',', '#']);

function isHexDigit(char: string | undefined): char is string {
  return char !== undefined && /^[0-9a-fA-F]$/.test(char);
}

function readPercentByte(input: string, index: number): { byte: number } | { error: DecodeError } {
  const h1 = input[index + 1];
  const h2 = input[index + 2];
  if (!isHexDigit(h1) || !isHexDigit(h2)) {
    return {
      error: {
        message: "Malformed percent-encoding: '%' is not followed by two hex digits",
        position: index,
      },
    };
  }
  return { byte: parseInt(h1 + h2, 16) };
}

/** Returns the UTF-8 sequence length for a leading byte, or null if invalid. */
function utf8SequenceLength(firstByte: number): number | null {
  if (firstByte < 0x80) return 1;
  if ((firstByte & 0xe0) === 0xc0) return 2;
  if ((firstByte & 0xf0) === 0xe0) return 3;
  if ((firstByte & 0xf8) === 0xf0) return 4;
  return null;
}

function formatByte(byte: number): string {
  return '%' + byte.toString(16).toUpperCase().padStart(2, '0');
}

interface PercentDecodeOptions {
  /** decodeURI-style: leave escapes that decode to a reserved URI char untouched. */
  preserveReserved: boolean;
  /** application/x-www-form-urlencoded-style: '+' decodes to a space. */
  plusAsSpace: boolean;
}

/**
 * Decodes a percent-encoded string one UTF-8 code point at a time, handling
 * multi-byte sequences and reporting the exact source position of the first
 * malformed escape or invalid UTF-8 byte sequence, instead of throwing.
 */
export function percentDecode(input: string, options: PercentDecodeOptions): DecodeOutcome {
  let output = '';
  let i = 0;
  const n = input.length;

  while (i < n) {
    const char = input[i];

    if (options.plusAsSpace && char === '+') {
      output += ' ';
      i += 1;
      continue;
    }

    if (char !== '%') {
      output += char;
      i += 1;
      continue;
    }

    const first = readPercentByte(input, i);
    if ('error' in first) return { ok: false, error: first.error };
    const leadByte = first.byte;
    const seqLen = utf8SequenceLength(leadByte);
    if (seqLen === null) {
      return {
        ok: false,
        error: {
          message: `Invalid UTF-8 leading byte ${formatByte(leadByte)}`,
          position: i,
        },
      };
    }

    if (seqLen === 1) {
      if (options.preserveReserved && URI_RESERVED.has(String.fromCharCode(leadByte))) {
        output += input.slice(i, i + 3);
      } else {
        output += String.fromCharCode(leadByte);
      }
      i += 3;
      continue;
    }

    const bytes = [leadByte];
    let cursor = i + 3;
    let complete = true;
    for (let k = 1; k < seqLen; k++) {
      if (input[cursor] !== '%') {
        complete = false;
        break;
      }
      const next = readPercentByte(input, cursor);
      if ('error' in next) return { ok: false, error: next.error };
      if ((next.byte & 0xc0) !== 0x80) {
        complete = false;
        break;
      }
      bytes.push(next.byte);
      cursor += 3;
    }

    if (!complete || bytes.length !== seqLen) {
      return {
        ok: false,
        error: {
          message: `Incomplete or invalid UTF-8 multi-byte sequence starting at ${formatByte(leadByte)}`,
          position: i,
        },
      };
    }

    try {
      output += new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
    } catch {
      return {
        ok: false,
        error: {
          message: `Invalid UTF-8 byte sequence starting at ${formatByte(leadByte)}`,
          position: i,
        },
      };
    }

    i = cursor;
  }

  return { ok: true, value: output };
}

/** Decodes `input` according to `mode`'s semantics. Never throws. */
export function percentDecodeForMode(input: string, mode: EncodeMode): DecodeOutcome {
  if (mode === 'uri') {
    return percentDecode(input, { preserveReserved: true, plusAsSpace: false });
  }
  if (mode === 'form') {
    return percentDecode(input, { preserveReserved: false, plusAsSpace: true });
  }
  // component, rfc3986, and full all decode the same way: every escape is
  // decoded unconditionally (rfc3986/full only differ from component on the
  // *encode* side, in which extra characters get escaped).
  return percentDecode(input, { preserveReserved: false, plusAsSpace: false });
}

export interface LineDecodeError {
  /** 1-based line number. */
  line: number;
  message: string;
  position: number;
}

export interface BatchDecodeResult {
  ok: boolean;
  text: string;
  errors: LineDecodeError[];
}

/**
 * Decodes `input` line-by-line (batch mode). Each line is decoded
 * independently; a line that fails to decode is left unchanged in the
 * output and recorded in `errors` (rather than aborting the whole batch).
 */
export function percentDecodeLines(input: string, mode: EncodeMode): BatchDecodeResult {
  const lines = input.split('\n');
  const outLines: string[] = [];
  const errors: LineDecodeError[] = [];

  lines.forEach((line, idx) => {
    const result = percentDecodeForMode(line, mode);
    if (result.ok) {
      outLines.push(result.value);
    } else {
      outLines.push(line);
      errors.push({ line: idx + 1, message: result.error.message, position: result.error.position });
    }
  });

  return { ok: errors.length === 0, text: outLines.join('\n'), errors };
}
