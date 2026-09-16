import { useState } from 'react';
import { Button, CopyButton, ErrorBox, Panel, TextArea, Toolbar } from '@mmoall/tool-kit';
import { describeJsonError, formatJsonErrorInfo } from './json-error';
import {
  buildQueryString,
  jsonValueToPairs,
  pairsToJsonObject,
  parseQueryPairs,
} from './query-json';

function jsonObjectToText(pairsQuery: string): string {
  const pairs = parseQueryPairs(pairsQuery);
  const obj = pairsToJsonObject(pairs);
  return JSON.stringify(obj, null, 2);
}

export function QueryJsonTab() {
  const [queryText, setQueryText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleQueryChange = (value: string) => {
    setQueryText(value);
    setJsonText(jsonObjectToText(value));
    setError(null);
  };

  const handleJsonChange = (value: string) => {
    setJsonText(value);

    if (value.trim() === '') {
      setQueryText('');
      setError(null);
      return;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(value);
    } catch (err) {
      setError(formatJsonErrorInfo(describeJsonError(err, value)));
      return;
    }

    const result = jsonValueToPairs(parsedJson);
    if ('error' in result) {
      setError(result.error);
      return;
    }

    setQueryText(buildQueryString(result.pairs));
    setError(null);
  };

  const handleClear = () => {
    setQueryText('');
    setJsonText('');
    setError(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <Toolbar>
        <Button variant="ghost" onClick={handleClear}>
          Clear
        </Button>
      </Toolbar>

      <p className="text-xs text-[var(--color-muted)]">
        A repeated query key (e.g. <code>a=1&amp;a=2</code>) becomes a JSON array (
        <code>{'{"a":["1","2"]}'}</code>). A JSON array value expands back into one{' '}
        <code>key=value</code> pair per element.
      </p>

      {error && <ErrorBox>{error}</ErrorBox>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Query string" actions={<CopyButton getText={() => queryText} />}>
          <TextArea
            aria-label="Query string"
            value={queryText}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="key=value&key2=value2"
            className="min-h-[240px]"
          />
        </Panel>

        <Panel title="JSON" actions={<CopyButton getText={() => jsonText} />}>
          <TextArea
            aria-label="JSON"
            value={jsonText}
            onChange={(event) => handleJsonChange(event.target.value)}
            placeholder={'{\n  "key": "value"\n}'}
            className="min-h-[240px]"
          />
        </Panel>
      </div>
    </div>
  );
}
