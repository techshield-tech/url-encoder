import { useEffect, useMemo, useState } from 'react';
import { Button, CopyButton, Panel, TextArea, Toolbar } from '@mmoall/tool-kit';
import { Field, StaticValue, TextField } from './local-ui';
import type { QueryPair } from './query-json';
import { buildUrl, getIdnInfo, parseUrl } from './url-parse';

export function UrlParserTab() {
  const [rawUrl, setRawUrl] = useState('');
  const [queryRows, setQueryRows] = useState<QueryPair[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const parsed = useMemo(() => parseUrl(rawUrl), [rawUrl]);

  // The query table is independently editable; it only resets from the
  // parsed URL when the raw URL text itself changes.
  useEffect(() => {
    setQueryRows(parsed.query);
    // Deliberately depends on rawUrl only, not on the `parsed` object
    // identity (which changes every render via useMemo).
  }, [rawUrl]);

  const rebuiltUrl = useMemo(
    () => buildUrl({ ...parsed, query: queryRows }),
    [parsed, queryRows],
  );

  const idnInfo = useMemo(() => getIdnInfo(parsed.hostname), [parsed.hostname]);

  const updateRow = (index: number, patch: Partial<QueryPair>) => {
    setQueryRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    setQueryRows((rows) => rows.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setQueryRows((rows) => [...rows, { key: '', value: '' }]);
  };

  const handleClear = () => {
    setRawUrl('');
    setQueryRows([]);
    setShowPassword(false);
  };

  const hasInput = rawUrl.trim() !== '';

  return (
    <div className="flex flex-col gap-4">
      <Panel title="URL">
        <div className="flex flex-col gap-3">
          <TextArea
            aria-label="URL to parse"
            value={rawUrl}
            onChange={(event) => setRawUrl(event.target.value)}
            placeholder="Paste a URL here, e.g. https://user:pass@例え.jp:8443/path?a=1&a=2#section"
            className="min-h-[80px]"
          />
          <Toolbar>
            <Button variant="ghost" onClick={handleClear}>
              Clear
            </Button>
          </Toolbar>
        </div>
      </Panel>

      {hasInput && (
        <>
          <Panel title="Components">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Protocol / scheme">
                <StaticValue>{parsed.protocol ? `${parsed.protocol}:` : ''}</StaticValue>
              </Field>
              <Field label="Host">
                <StaticValue>{parsed.hostname}</StaticValue>
              </Field>
              <Field label="Username">
                <StaticValue>{parsed.username}</StaticValue>
              </Field>
              <Field label="Password">
                <div className="flex items-center gap-2">
                  <StaticValue>
                    {parsed.password ? (showPassword ? parsed.password : '•'.repeat(8)) : ''}
                  </StaticValue>
                  {parsed.password && (
                    <Button variant="ghost" onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? 'Hide' : 'Show'}
                    </Button>
                  )}
                </div>
              </Field>
              <Field label="Port">
                <StaticValue>{parsed.port}</StaticValue>
              </Field>
              <Field label="Pathname">
                <StaticValue>{parsed.pathname}</StaticValue>
              </Field>
              <Field label="Hash / fragment" className="sm:col-span-2">
                <StaticValue>{parsed.hash}</StaticValue>
              </Field>
            </div>

            {idnInfo && (
              <div className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-sm">
                <p className="mb-1 font-medium text-[var(--color-fg)]">
                  Internationalized domain name (IDN)
                </p>
                <p className="text-[var(--color-muted)]">
                  Punycode / ASCII: <span className="text-[var(--color-fg)]">{idnInfo.ascii ?? '—'}</span>
                </p>
                <p className="text-[var(--color-muted)]">
                  Unicode: <span className="text-[var(--color-fg)]">{idnInfo.unicode ?? '—'}</span>
                </p>
              </div>
            )}
          </Panel>

          <Panel
            title="Query parameters"
            actions={
              <Button variant="secondary" onClick={addRow}>
                + Add row
              </Button>
            }
          >
            {queryRows.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No query parameters.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {queryRows.map((row, index) => (
                  <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <TextField
                      aria-label={`Query key ${index + 1}`}
                      value={row.key}
                      onChange={(event) => updateRow(index, { key: event.target.value })}
                      placeholder="key"
                      className="sm:flex-1"
                    />
                    <TextField
                      aria-label={`Query value ${index + 1}`}
                      value={row.value}
                      onChange={(event) => updateRow(index, { value: event.target.value })}
                      placeholder="value"
                      className="sm:flex-1"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => removeRow(index)}
                      aria-label={`Remove row ${index + 1}`}
                      className="self-end sm:self-auto"
                    >
                      ✕ Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-[var(--color-muted)]">
              Repeated keys each get their own row here, instead of being collapsed into one.
            </p>
          </Panel>

          <Panel title="Rebuilt URL" actions={<CopyButton getText={() => rebuiltUrl} />}>
            <StaticValue>{rebuiltUrl}</StaticValue>
          </Panel>
        </>
      )}
    </div>
  );
}
