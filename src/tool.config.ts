// Per-tool metadata. This is the ONE file (together with `src/tool/`,
// `index.html`'s fallback <title>, and this repo's README) that changes
// when this template is copied to a new tool repo.

// Imports from '@mmoall/tool-kit/config' (a plain-JS-backed subpath), not
// the main '@mmoall/tool-kit' barrel — this file is also reachable from
// vite.config.ts's config-load chain, which cannot load the main barrel's
// .ts source from inside node_modules. See '@mmoall/tool-kit/config's
// source comment for why.
import { defineToolConfig } from '@mmoall/tool-kit/config';

export const toolConfig = defineToolConfig({
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
});
