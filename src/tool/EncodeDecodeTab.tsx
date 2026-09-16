import { useEffect, useState } from 'react';
import { Button, CopyButton, ErrorBox, Panel, Select, TextArea, Toolbar } from '../shell/ui';
import {
  ENCODE_MODE_OPTIONS,
  percentDecodeForMode,
  percentDecodeLines,
  percentEncode,
  percentEncodeLines,
  type EncodeMode,
} from './percent-encoding';

function encodeFor(text: string, mode: EncodeMode, batch: boolean): string {
  return batch ? percentEncodeLines(text, mode) : percentEncode(text, mode);
}

export function EncodeDecodeTab() {
  const [decoded, setDecoded] = useState('');
  const [encoded, setEncoded] = useState('');
  const [mode, setMode] = useState<EncodeMode>('component');
  const [batch, setBatch] = useState(false);
  // One entry per error line, so batch-mode's multiple per-line errors each
  // render on their own line instead of running together as plain text.
  const [error, setError] = useState<string[] | null>(null);

  // Re-derive the encoded side whenever the mode or batch setting changes,
  // treating the decoded side as the source of truth.
  useEffect(() => {
    setEncoded(encodeFor(decoded, mode, batch));
    setError(null);
    // Deliberately depends on [mode, batch] only: typing in either textarea
    // is handled by its own onChange handler below, not by this effect.
  }, [mode, batch]);

  const handleDecodedChange = (value: string) => {
    setDecoded(value);
    setEncoded(encodeFor(value, mode, batch));
    setError(null);
  };

  const handleEncodedChange = (value: string) => {
    setEncoded(value);

    if (batch) {
      const result = percentDecodeLines(value, mode);
      setDecoded(result.text);
      if (result.errors.length > 0) {
        setError(
          result.errors.map((e) => `Line ${e.line}, position ${e.position}: ${e.message}`),
        );
      } else {
        setError(null);
      }
      return;
    }

    const result = percentDecodeForMode(value, mode);
    if (result.ok) {
      setDecoded(result.value);
      setError(null);
    } else {
      // Leave `decoded` unchanged so a malformed edit doesn't wipe out the
      // last valid decoded text; just surface the error.
      setError([`Position ${result.error.position}: ${result.error.message}`]);
    }
  };

  const handleSwap = () => {
    setDecoded(encoded);
    setEncoded(decoded);
    setError(null);
  };

  const handleClear = () => {
    setDecoded('');
    setEncoded('');
    setError(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <Toolbar>
        <Select
          aria-label="Encoding mode"
          value={mode}
          onChange={(event) => setMode(event.target.value as EncodeMode)}
          options={ENCODE_MODE_OPTIONS}
        />
        <label className="flex items-center gap-1.5 text-sm text-[var(--color-fg)]">
          <input
            type="checkbox"
            checked={batch}
            onChange={(event) => setBatch(event.target.checked)}
          />
          Batch mode (one item per line)
        </label>
        <Button variant="secondary" onClick={handleSwap}>
          ⇅ Swap
        </Button>
        <Button variant="ghost" onClick={handleClear}>
          Clear
        </Button>
      </Toolbar>

      {error && (
        <ErrorBox>
          {error.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </ErrorBox>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Plain text">
          <TextArea
            aria-label="Plain text"
            value={decoded}
            onChange={(event) => handleDecodedChange(event.target.value)}
            placeholder="Type or paste plain text here…"
            className="min-h-[240px]"
          />
        </Panel>

        <Panel title="Percent-encoded" actions={<CopyButton getText={() => encoded} />}>
          <TextArea
            aria-label="Percent-encoded text"
            value={encoded}
            onChange={(event) => handleEncodedChange(event.target.value)}
            placeholder="Type or paste percent-encoded text here…"
            className="min-h-[240px]"
          />
        </Panel>
      </div>
    </div>
  );
}
