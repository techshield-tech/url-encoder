import { useState } from 'react';
import { EncodeDecodeTab } from './EncodeDecodeTab';
import { UrlParserTab } from './UrlParserTab';
import { QueryJsonTab } from './QueryJsonTab';

type TabId = 'encode' | 'parser' | 'query-json';

const TABS: { id: TabId; label: string }[] = [
  { id: 'encode', label: 'Encode / Decode' },
  { id: 'parser', label: 'URL Parser' },
  { id: 'query-json', label: 'Query String ↔ JSON' },
];

export function Tool() {
  const [activeTab, setActiveTab] = useState<TabId>('encode');

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
                : 'text-[var(--color-muted)] hover:bg-[var(--color-panel)] hover:text-[var(--color-fg)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'encode' && <EncodeDecodeTab />}
      {activeTab === 'parser' && <UrlParserTab />}
      {activeTab === 'query-json' && <QueryJsonTab />}
    </div>
  );
}
