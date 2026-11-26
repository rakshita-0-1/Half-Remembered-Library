import { useEffect, useState } from 'react';
import { Hammer, Play } from 'lucide-react';
import type { LibraryState } from '../types';

interface IndexingPageProps {
  state: LibraryState;
  onBuildIndex: () => Promise<{ ok: boolean; buildCode?: number; error?: string }>;
  onRunTests: () => Promise<{ ok: boolean; output?: string; error?: string }>;
}

export function IndexingPage({ state, onBuildIndex, onRunTests }: IndexingPageProps) {
  const sampleWords = state.catalog.slice(0, 40);
  const [selectedWord, setSelectedWord] = useState(sampleWords[0]?.title ?? 'catdog');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'info' | 'err'; text: string } | null>(
    null,
  );
  const [building, setBuilding] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [runningTests, setRunningTests] = useState(false);

  useEffect(() => {
    if (sampleWords.length === 0) {
      setSelectedWord('catdog');
    } else if (!sampleWords.some((w) => w.title === selectedWord)) {
      setSelectedWord(sampleWords[0].title);
    }
  }, [state.catalog, selectedWord, sampleWords]);

  const handleBuild = async () => {
    setBuilding(true);
    try {
      const res = await onBuildIndex();
      if (res.buildCode === 1) {
        setFeedback({
          type: 'ok',
          text: 'Trie index constructed in C from the active catalog.',
        });
      } else if (res.buildCode === 2) {
        setFeedback({
          type: 'info',
          text: 'Index is already built and current (single-build rule: catalog has not changed).',
        });
      } else {
        setFeedback({
          type: 'err',
          text: res.error || 'Failed to build Trie index.',
        });
      }
    } finally {
      setBuilding(false);
    }
  };

  const handleRunCTests = async () => {
    setRunningTests(true);
    try {
      const res = await onRunTests();
      setTestOutput(res.ok ? (res.output ?? 'Tests completed.') : `Error: ${res.error}`);
    } finally {
      setRunningTests(false);
    }
  };

  const suffixes: string[] = [];
  for (let i = 0; i <= selectedWord.length; i++) {
    suffixes.push(selectedWord.slice(i));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Trie Index Construction & Performance
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Built once over all catalog titles in <code className="text-cyan-300">O(N × L²)</code>;
            rebuilt only when the catalog changes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleBuild()}
          disabled={building}
          className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-md shadow-cyan-500/20 transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-60"
        >
          <Hammer className="h-4 w-4" aria-hidden="true" />
          <span>Build Index</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'ok'
              ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200'
              : feedback.type === 'err'
                ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                : 'border-sky-400/35 bg-sky-500/10 text-sky-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* 4 Backend Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400">Index Status</p>
          <p
            className={`mt-2 text-2xl font-bold ${
              state.isIndexed ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {state.isIndexed ? 'Built & Active' : 'Not Built'}
          </p>
          <p className="mt-1 text-xs text-slate-400">Single-build guard active</p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400">Records Indexed</p>
          <p className="tabular-nums mt-2 text-3xl font-bold text-white">
            {state.indexedCount.toLocaleString()}
          </p>
          <p className="tabular-nums mt-1 text-xs text-slate-400">
            Out of {state.catalogCount.toLocaleString()} in catalog
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400">Trie Nodes Created</p>
          <p className="tabular-nums mt-2 text-3xl font-bold text-white">
            {state.trieNodeCount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-400">27-child nodes (a–z + #)</p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400">Build Time (Measured)</p>
          <p className="tabular-nums mt-2 text-3xl font-bold text-white">
            {state.indexBuildTimeMs.toFixed(3)} ms
          </p>
          <p className="mt-1 text-xs text-slate-400">Real C clock() measurement</p>
        </div>
      </div>

      {/* Suffix Indexing Visualizer */}
      <section className="glass-panel rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Suffix Indexing Visualizer</h3>
            <p className="mt-0.5 text-sm text-slate-300">
              Every <code className="text-cyan-300">suffix + '#' + original_word</code> sequence
              inserted by <code>insertWord()</code>.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <label htmlFor="vizWordSelect" className="text-xs font-medium text-slate-300">
              Inspect Title:
            </label>
            <select
              id="vizWordSelect"
              value={selectedWord}
              onChange={(e) => setSelectedWord(e.target.value)}
              className="rounded-xl border border-violet-300/25 bg-[#070b1a]/80 px-3 py-2 font-mono text-sm text-white focus:border-cyan-400 focus:outline-none"
            >
              {sampleWords.length === 0 ? (
                <option value="catdog">Sample: catdog</option>
              ) : (
                sampleWords.map((item) => (
                  <option key={item.id} value={item.title}>
                    ID {item.id}: {item.title}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {suffixes.map((suf, idx) => (
            <div
              key={`${selectedWord}-${idx}`}
              className="flex items-center justify-between rounded-xl border border-cyan-400/20 bg-[#090e22]/70 px-3.5 py-2.5 font-mono text-sm"
            >
              <span>
                <span className="text-cyan-300">{suf || '∅'}</span>
                <span className="font-bold text-violet-300">#</span>
                <span className="text-white">{selectedWord}</span>
              </span>
              <span className="tabular-nums text-xs text-slate-400">#{idx + 1}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Complexity Proof */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white">
            Index Construction: <code className="text-cyan-300">O(N × L²)</code>
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Each of the <strong className="text-white">N</strong> catalog titles (max length{' '}
            <strong className="text-white">L ≤ 8</strong>) generates{' '}
            <strong className="text-white">L + 1</strong> suffixes. Inserting all{' '}
            <code>suffix#word</code> chains runs once and reuses shared prefixes across all titles.
          </p>
          <div className="mt-4 divide-y divide-slate-400/15 text-sm">
            <div className="flex justify-between py-2.5">
              <span className="text-slate-400">Current Catalog Size (N)</span>
              <strong className="tabular-nums text-white">{state.catalogCount} records</strong>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-400">Max Title Length (L)</span>
              <strong className="text-white">8 characters</strong>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-400">Allocated C Trie Nodes</span>
              <strong className="tabular-nums text-white">
                {state.trieNodeCount.toLocaleString()} nodes
              </strong>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white">
            Repeated Queries: <code className="text-cyan-300">O(P + S)</code>
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Each search walks <strong className="text-white">S</strong> suffix characters, the{' '}
            <code className="text-cyan-300">#</code> separator, and{' '}
            <strong className="text-white">P</strong> prefix characters—reading{' '}
            <code>maxId</code> directly without scanning a single catalog record.
          </p>
          <div className="mt-4 divide-y divide-slate-400/15 text-sm">
            <div className="flex justify-between py-2.5">
              <span className="text-slate-400">Total Queries Processed</span>
              <strong className="tabular-nums text-white">{state.queriesProcessed}</strong>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-400">Last Query Trie Hops</span>
              <strong className="tabular-nums text-white">
                {state.history.length > 0 ? `${state.history[0].steps} hops` : '—'}
              </strong>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-400">Catalog Scans Performed</span>
              <strong className="text-cyan-300">0 (100% Trie traversal)</strong>
            </div>
          </div>
        </section>
      </div>

      {/* Live Automated C Test Runner */}
      <section className="glass-panel rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">
              Automated C Verification Suite (15 Test Scenarios)
            </h3>
            <p className="mt-0.5 text-sm text-slate-300">
              Executes the compiled <code>tests.c</code> binary directly on the server.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRunCTests()}
            disabled={runningTests}
            className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-cyan-400/35 bg-cyan-400/15 px-4 py-2.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/25 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{runningTests ? 'Running C Tests...' : 'Run 15 C Tests'}</span>
          </button>
        </div>

        {testOutput && (
          <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-400/15 bg-[#050814] p-4 font-mono text-xs leading-relaxed text-emerald-300">
            {testOutput}
          </pre>
        )}
      </section>
    </div>
  );
}
