import { useState } from 'react';
import { motion } from 'motion/react';
import { BookX, CheckCircle2, AlertTriangle, Search, RotateCcw, Trash2 } from 'lucide-react';
import type { LibraryState, SearchResponse } from '../types';

interface SearchPageProps {
  state: LibraryState;
  onSearch: (prefix: string, suffix: string) => Promise<SearchResponse>;
  onLoadDemoAndBuild: () => Promise<void>;
  onBuildIndex: () => Promise<void>;
  onClearHistory: () => Promise<void>;
}

const JUDGE_DEMO_QUERIES = [
  { id: 1, label: 'Query 1', prefix: 'ca', suffix: 'ch', note: 'catch (ID 1)' },
  { id: 2, label: 'Query 2', prefix: 'cat', suffix: 'og', note: 'catalog (ID 3)*' },
  { id: 3, label: 'Query 3', prefix: 'cat', suffix: 'log', note: 'catalog (ID 3)' },
  { id: 4, label: 'Query 4', prefix: 'dog', suffix: 'cat', note: 'No match' },
  { id: 5, label: 'Query 5', prefix: 'cat', suffix: 'og', note: 'Repeat O(P+S)' },
  { id: 6, label: 'Bonus', prefix: 'cat', suffix: 'dog', note: 'catdog (ID 2)' },
];

export function SearchPage({
  state,
  onSearch,
  onLoadDemoAndBuild,
  onBuildIndex,
  onClearHistory,
}: SearchPageProps) {
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [searching, setSearching] = useState(false);
  const [lastResult, setLastResult] = useState<{
    prefix: string;
    suffix: string;
    response: SearchResponse;
  } | null>(null);

  const runQuery = async (p: string, s: string) => {
    setSearching(true);
    try {
      const response = await onSearch(p, s);
      setLastResult({ prefix: p, suffix: s, response });
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runQuery(prefix, suffix);
  };

  const handleClearInputs = () => {
    setPrefix('');
    setSuffix('');
    setLastResult(null);
  };

  const handleDemoChip = (p: string, s: string) => {
    setPrefix(p);
    setSuffix(s);
    void runQuery(p, s);
  };

  const previewKey = `${suffix.length > 0 ? suffix : '?'}#${prefix.length > 0 ? prefix : '?'}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Partial-Title Search
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Enter both beginning and ending clues. Every lookup runs directly in the compiled C Trie.
          </p>
        </div>

        <div className="text-sm font-medium text-slate-300">
          Index status:{' '}
          <span className={state.isIndexed ? 'text-emerald-300' : 'text-amber-300'}>
            {state.isIndexed
              ? `Ready (${state.indexedCount.toLocaleString()} titles · ${state.trieNodeCount.toLocaleString()} nodes)`
              : 'Not built or stale'}
          </span>
        </div>
      </div>

      {/* Main Search Panel */}
      <section className="glass-panel rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
          <div className="md:col-span-4">
            <label htmlFor="prefixInput" className="mb-1.5 block text-sm font-medium text-violet-200">
              Beginning of Title (Prefix)
            </label>
            <input
              id="prefixInput"
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. cat"
              maxLength={16}
              autoComplete="off"
              className="w-full rounded-xl border border-violet-300/25 bg-[#070b1a]/80 px-4 py-3 font-mono text-base text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/25"
            />
            <p className="mt-1.5 text-xs text-slate-400">Lowercase a–z, non-empty, max 8 chars</p>
          </div>

          <div className="flex flex-col items-center justify-center pb-5 md:col-span-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-300/30 bg-violet-500/20 font-mono text-base font-bold text-violet-200">
              #
            </span>
          </div>

          <div className="md:col-span-4">
            <label htmlFor="suffixInput" className="mb-1.5 block text-sm font-medium text-violet-200">
              Ending of Title (Suffix)
            </label>
            <input
              id="suffixInput"
              type="text"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              placeholder="e.g. og"
              maxLength={16}
              autoComplete="off"
              className="w-full rounded-xl border border-violet-300/25 bg-[#070b1a]/80 px-4 py-3 font-mono text-base text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/25"
            />
            <p className="mt-1.5 text-xs text-slate-400">Lowercase a–z, non-empty, max 8 chars</p>
          </div>

          <div className="flex items-center gap-2.5 pb-5 md:col-span-3 md:justify-end">
            <button
              type="submit"
              disabled={searching}
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-md shadow-cyan-500/20 transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-60 md:flex-none"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span>SEARCH</span>
            </button>
            <button
              type="button"
              onClick={handleClearInputs}
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-400/25 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Clear</span>
            </button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-400/15 pt-4 text-sm text-slate-300">
          <span>Constructed Trie Traversal Key (<code>suffix#prefix</code>):</span>
          <code className="rounded-lg bg-cyan-400/10 px-3 py-1 font-mono text-sm font-semibold text-cyan-300">
            {previewKey}
          </code>
        </div>
      </section>

      {/* Search Result Display */}
      {lastResult && (
        <motion.section
          key={`${lastResult.prefix}-${lastResult.suffix}-${lastResult.response.queriesProcessed ?? 0}-${lastResult.response.code}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          aria-live="polite"
          className={`rounded-2xl border p-6 ${
            lastResult.response.code >= 0
              ? 'border-emerald-400/40 bg-emerald-500/10'
              : lastResult.response.code === -1
                ? 'border-violet-300/25 bg-slate-900/60'
                : 'border-rose-400/40 bg-rose-500/10'
          }`}
        >
          {lastResult.response.code >= 0 ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  <span>Match Found in C Trie</span>
                </div>
                <span className="font-mono text-sm font-semibold text-cyan-300">
                  Record ID: {lastResult.response.resultId}
                </span>
              </div>

              <p className="mt-3 font-mono text-3xl font-bold text-white">
                {lastResult.response.resultTitle}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Matched beginning <code className="text-cyan-300">{lastResult.prefix}</code> and ending{' '}
                <code className="text-cyan-300">{lastResult.suffix}</code> along Trie path{' '}
                <code className="text-cyan-300">
                  {lastResult.suffix}#{lastResult.prefix}
                </code>
                .
              </p>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-emerald-300/20 pt-3 text-sm text-slate-300 tabular-nums">
                <span>
                  Record ID: <strong className="text-white">{lastResult.response.resultId}</strong>
                </span>
                <span>
                  Trie Character Hops:{' '}
                  <strong className="text-white">{lastResult.response.steps}</strong>
                </span>
                <span>
                  Measured C Execution:{' '}
                  <strong className="text-white">
                    {lastResult.response.timeUs.toFixed(2)} µs
                  </strong>
                </span>
                <span>
                  Catalog Scans: <strong className="text-cyan-300">0</strong>
                </span>
              </div>
            </div>
          ) : lastResult.response.code === -1 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <BookX className="h-9 w-9 shrink-0 text-violet-300" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-violet-200">No Matching Title</p>
                <p className="mt-1 text-base text-slate-100">
                  {lastResult.response.error ||
                    "Oops! We couldn't find a book matching both clues. Try another combination!"}
                </p>
                <p className="mt-2 text-xs text-slate-400 tabular-nums">
                  Traversed path{' '}
                  <code className="text-cyan-300">
                    {lastResult.suffix}#{lastResult.prefix}
                  </code>{' '}
                  · {lastResult.response.steps} character hops before miss
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-rose-200">
                    {lastResult.response.code === -2 ? 'Index Not Built' : 'Invalid Search Input'}
                  </p>
                  <p className="mt-1 text-sm text-rose-100">{lastResult.response.error}</p>
                </div>
              </div>

              {lastResult.response.code === -2 && (
                <button
                  type="button"
                  onClick={() => void onBuildIndex()}
                  className="cursor-pointer whitespace-nowrap rounded-lg bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300"
                >
                  Build Index Now
                </button>
              )}
            </div>
          )}
        </motion.section>
      )}

      {/* Interactive Judge Demonstration */}
      <section className="glass-panel rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Interactive Judge Demonstration</h3>
            <p className="mt-1 text-sm text-slate-300">
              Demo catalog:{' '}
              <code className="text-cyan-300">
                0: catalog · 1: catch · 2: catdog · 3: catalog · 4: car · 5: dog
              </code>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onLoadDemoAndBuild()}
            className="cursor-pointer whitespace-nowrap rounded-xl border border-violet-300/30 bg-violet-500/20 px-4 py-2 text-sm font-semibold text-violet-100 transition-colors hover:bg-violet-500/30"
          >
            Load Demo Catalog & Build Index
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {JUDGE_DEMO_QUERIES.map((q) => (
            <button
              key={`${q.id}-${q.prefix}-${q.suffix}`}
              type="button"
              onClick={() => handleDemoChip(q.prefix, q.suffix)}
              className="flex cursor-pointer flex-col items-start rounded-xl border border-violet-300/20 bg-[#090f24]/70 px-4 py-3 text-left transition-colors hover:border-cyan-400/50 hover:bg-cyan-400/10"
            >
              <span className="text-sm font-semibold text-white">
                {q.label}: <code className="text-cyan-300">{q.prefix}</code> +{' '}
                <code className="text-cyan-300">{q.suffix}</code>
              </span>
              <span className="mt-0.5 text-xs text-violet-200">{q.note}</span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          * Algorithmic accuracy note: In the 6-record demo catalog, both{' '}
          <code className="text-cyan-300">catdog</code> (ID 2) and{' '}
          <code className="text-cyan-300">catalog</code> (ID 3) begin with <code>cat</code> and
          end with <code>og</code>. Because ID 3 was inserted after ID 2, the C Trie faithfully
          returns the latest matching record: <code>catalog</code> (ID 3). Use{' '}
          <code>cat</code> + <code>dog</code> to uniquely isolate <code>catdog</code> (ID 2).
        </p>
      </section>

      {/* Search History (maintained in C backend) */}
      <section className="glass-panel rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Search History</h3>
            <p className="tabular-nums mt-0.5 text-xs text-slate-400">
              {state.historyCount.toLocaleString()} / 2,000 queries stored in C backend
            </p>
          </div>

          <button
            type="button"
            onClick={() => void onClearHistory()}
            disabled={state.historyCount === 0}
            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-400/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear History</span>
          </button>
        </div>

        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
          {state.history.length === 0 ? (
            <p className="py-4 text-sm text-slate-400">
              No searches performed yet. Try a prefix and suffix query above.
            </p>
          ) : (
            state.history.map((entry) => (
              <div
                key={entry.index}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-400/15 bg-[#090e22]/70 px-4 py-2.5 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums font-mono text-xs text-slate-400">
                    #{entry.index}
                  </span>
                  <span className="text-slate-200">
                    <code className="text-cyan-300">{entry.prefix}</code> +{' '}
                    <code className="text-cyan-300">{entry.suffix}</code>
                  </span>
                  <span className="text-slate-500">→</span>
                  <code className="text-xs text-violet-200">
                    {entry.suffix}#{entry.prefix}
                  </code>
                </div>

                <div className="tabular-nums text-xs">
                  {entry.resultId >= 0 ? (
                    <span className="font-semibold text-emerald-300">
                      {entry.resultTitle} (ID {entry.resultId})
                    </span>
                  ) : (
                    <span className="text-slate-400">No match</span>
                  )}{' '}
                  <span className="text-slate-500">·</span>{' '}
                  <span className="text-slate-400">{entry.steps} steps</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
