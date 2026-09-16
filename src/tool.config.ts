// Per-tool metadata. This is the ONE file (together with the `base` in
// vite.config.ts, index.html's <title>/meta tags, README.md, and everything
// under src/tool/) that changes when this template is copied to a sibling
// tool repo.

export type ToolCategory = 'JSON' | 'JWT' | 'SQL' | 'Docker' | 'Git' | 'Web';

export interface ToolConfig {
  /** Unique identifier used in embed postMessage payloads and URLs. */
  slug: string;
  /** Display name shown in the header. */
  name: string;
  /** Short description used for meta tags and listings. */
  description: string;
  /** One of the shared MMOALL tool categories. */
  category: ToolCategory;
  /** Keywords for search/SEO purposes. */
  keywords: string[];
}

export const toolConfig: ToolConfig = {
  slug: 'url-encoder',
  name: 'URL Encoder / Decoder & Parser',
  description:
    'Encode/decode URLs and query strings, parse a URL into its components, and convert between query strings and JSON — fast, free, and 100% client-side.',
  category: 'Web',
  keywords: [
    'url encoder',
    'url decoder',
    'percent encoding',
    'uri encode',
    'url parser',
    'query string parser',
    'query string to json',
    'json to query string',
    'punycode decoder',
    'online url tool',
  ],
};
