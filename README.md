# URL Encoder / Decoder & Parser

Encode/decode URLs and query strings, parse a URL into its components, and convert between query strings and JSON — fast, free, and 100% client-side. Your input is never sent over the network; everything runs in your browser.

**Live:** https://techshield-tech.github.io/url-encoder/

Part of [MMOALL Developer Tools](https://mmoall.com/tools). Also available at [mmoall.com/tools/url-encoder](https://mmoall.com/tools/url-encoder).

## Features

### Encode / Decode

- Live two-way conversion between plain text and its percent-encoded form (typing on either side updates the other), with a swap button.
- Five encoding modes:
  - `encodeURIComponent` / `decodeURIComponent` semantics
  - `encodeURI` / `decodeURI` semantics (reserved characters `; / ? : @ & = + $ , #` are left un-encoded, and escapes that would decode to one of them are preserved rather than unescaped)
  - `application/x-www-form-urlencoded` (space encodes to `+`; decoding treats `+` as space)
  - RFC 3986 strict — only the unreserved set (`A-Z a-z 0-9 - _ . ~`) is left un-encoded, so `! ' ( ) *` get percent-encoded too
  - Full percent-encode — every byte of the input is `%XX`-encoded, no exceptions
- Batch mode: treat the input as one item per line, encoding/decoding each line independently.
- Malformed percent-sequences never throw — decoding fails gracefully with a clear error, including the character position where it went wrong (per line, in batch mode).
- Correct for UTF-8 multi-byte characters in both directions (percent-encoding and decoding are implemented by hand, byte-by-byte, on top of `TextEncoder`/`TextDecoder`).

### URL Parser

- Parses a URL into protocol/scheme, username, password, host, port, pathname, query parameters, and hash/fragment.
- Password is masked by default, with a show/hide toggle.
- Query parameters are shown as an editable table (add row, remove row, edit key or value), with the full URL rebuilt live as you edit. Repeated query keys each get their own row instead of being collapsed.
- Shows both the punycode/ASCII and Unicode forms of the host whenever it's an internationalized domain name (punycode `xn--...` labels, or a host containing non-ASCII characters directly).

### Query string ↔ JSON

- Query string → JSON: parses `key=value&...` into a JSON object; a repeated key collapses into a JSON array of its values (documented inline in the UI).
- JSON → query string: serializes a flat (or reasonably shallow) JSON object back into a query string, expanding array values into repeated `key=value` pairs.
- Both directions are live and editable in place, with clear error messages for invalid JSON.

### General

- 100% client-side and offline — nothing is ever sent over the network.
- Runtime dependencies are React and `@mmoall/tool-kit` (the shared shell/UI/theme/embed/SEO package used across MMOALL tools). This tool's own logic — percent-encoding, UTF-8 handling, and punycode decoding — is implemented from scratch. The one exception is converting an already-Unicode host to its ASCII/punycode form, which uses the browser's own `URL` parser (there's no simpler way to do IDNA `ToASCII` correctly without reimplementing it).
- Responsive down to 360px viewport width.

## Embedding

This tool can be embedded in an iframe, e.g. on mmoall.com. In embed mode it
renders only the tool itself (no header/footer) on a transparent background.

```html
<iframe
  id="url-encoder"
  src="https://techshield-tech.github.io/url-encoder/?embed=1&theme=dark"
  style="width: 100%; border: 0;"
  title="URL Encoder / Decoder & Parser"
></iframe>

<script>
  const iframe = document.getElementById('url-encoder');

  // Resize the iframe to fit its content.
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (data && data.type === 'mmoall-tool:height' && data.slug === 'url-encoder') {
      iframe.style.height = `${data.height}px`;
    }
    if (data && data.type === 'mmoall-tool:ready' && data.slug === 'url-encoder') {
      // The tool has mounted and is ready.
    }
  });

  // Push a theme change into the iframe (only accepted from an allowed origin).
  iframe.contentWindow.postMessage({ type: 'mmoall-tool:theme', theme: 'dark' }, '*');
</script>
```

### Contract

- `?embed=1` in the URL renders only the tool (no chrome), transparent
  background.
- `?theme=light` / `?theme=dark` sets the initial theme; otherwise it follows
  `prefers-color-scheme`.
- The page listens for `window.postMessage({type:'mmoall-tool:theme', theme})`
  from the parent frame to change theme at runtime. Only messages whose
  `event.origin` is `https://mmoall.com`, `https://www.mmoall.com`, or
  `http://localhost:3000` are accepted.
- On mount (embed mode only), the page posts
  `{type:'mmoall-tool:ready', slug:'url-encoder'}` to `window.parent`.
- Whenever its rendered height changes (embed mode only), the page posts
  `{type:'mmoall-tool:height', slug:'url-encoder', height}` to
  `window.parent`.

## Local development

```bash
bun install
bun dev
```

Build for production:

```bash
bun run build
```

Deployment to GitHub Pages happens automatically via
`.github/workflows/deploy.yml` on every push to `main`.

## License

MIT — see [LICENSE](./LICENSE).
