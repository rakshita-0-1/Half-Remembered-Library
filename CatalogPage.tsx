import { useMemo, useState } from 'react';
import { Plus, Database, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LibraryState } from '../types';

interface CatalogPageProps {
  state: LibraryState;
  onAddRecord: (title: string) => Promise<{ ok: boolean; id?: number; error?: string }>;
  onLoadDemo: () => Promise<void>;
  onLoadStress: () => Promise<void>;
  onClearCatalog: () => Promise<void>;
}

const PAGE_SIZE = 50;

export function CatalogPage({
  state,
  onAddRecord,
  onLoadDemo,
  onLoadStress,
  onClearCatalog,
}: CatalogPageProps) {
  const [newTitle, setNewTitle] = useState('');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err' | 'info'; text: string } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  const duplicateTitles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of state.catalog) {
      counts.set(r.title, (counts.get(r.title) ?? 0) + 1);
    }
    return counts;
  }, [state.catalog]);

  const totalPages = Math.max(1, Math.ceil(state.catalog.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const visibleRecords = state.catalog.slice(startIdx, startIdx + PAGE_SIZE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await onAddRecord(newTitle);
      if (res.ok) {
        setFeedback({
          type: 'ok',
          text: `Added "${newTitle}" with Record ID #${res.id}. Index invalidated — rebuild on Indexing page before searching.`,
        });
        setNewTitle('');
      } else {
        setFeedback({
          type: 'err',
          text: res.error || 'Title rejected by C catalog validator.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDemo = async () => {
    await onLoadDemo();
    setPage(1);
    setFeedback({
      type: 'info',
      text: 'Loaded 6 predefined demo records. Index invalidated — click Build Index to index them.',
    });
  };

  const handleBulkStress = async () => {
    await onLoadStress();
    setPage(1);
    setFeedback({
      type: 'info',
      text: 'Loaded 1,000 benchmark records. Open Indexing to measure O(N × L²) index construction.',
    });
  };

  const handleBulkClear = async () => {
    await onClearCatalog();
    setPage(1);
    setFeedback({
      type: 'info',
      text: 'Catalog cleared and C Trie memory freed.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Library Catalog Management
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Managed independently by <code className="text-cyan-300">catalog.c</code>. Sequential
            IDs start at 0; duplicate titles keep distinct IDs.
          </p>
        </div>

        <div className="tabular-nums text-sm font-semibold text-violet-200">
          {state.catalogCount.toLocaleString()} / 1,000 Records
        </div>
      </div>

      {/* Add & Bulk Controls */}
      <section className="glass-panel rounded-2xl p-6">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label htmlFor="newTitleInput" className="mb-1.5 block text-sm font-medium text-violet-200">
              Add New Catalog Title
            </label>
            <input
              id="newTitleInput"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="lowercase single word (max 8 chars), e.g. archive"
              maxLength={24}
              autoComplete="off"
              className="w-full rounded-xl border border-violet-300/25 bg-[#070b1a]/80 px-4 py-3 font-mono text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/25"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-5 py-3 text-sm font-bold text-slate-950 transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add Record</span>
          </button>
        </form>

        {feedback && (
          <div
            role="status"
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
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

        <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-400/15 pt-4">
          <button
            type="button"
            onClick={() => void handleBulkDemo()}
            className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-violet-300/30 bg-violet-500/20 px-4 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/30"
          >
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Load Predefined Demo Catalog (6)</span>
          </button>

          <button
            type="button"
            onClick={() => void handleBulkStress()}
            className="cursor-pointer whitespace-nowrap rounded-xl border border-slate-400/25 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            Load 1,000-Record Benchmark Catalog
          </button>

          <button
            type="button"
            onClick={() => void handleBulkClear()}
            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear Catalog</span>
          </button>
        </div>
      </section>

      {/* Catalog Table */}
      <section className="glass-panel rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-white">Catalog Records</h3>

          {state.catalog.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-300 tabular-nums">
              {totalPages > 1 ? (
                <>
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex cursor-pointer items-center rounded-lg border border-slate-400/25 px-2.5 py-1.5 hover:bg-white/10 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span>
                    Page {safePage} / {totalPages} ({startIdx}–
                    {Math.min(state.catalog.length - 1, startIdx + PAGE_SIZE - 1)})
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex cursor-pointer items-center rounded-lg border border-slate-400/25 px-2.5 py-1.5 hover:bg-white/10 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <span>Showing all {state.catalog.length} records</span>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-400/20 text-xs font-semibold tracking-wider text-violet-200 uppercase">
                <th className="px-4 py-3">Record ID</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Insertion Order</th>
                <th className="px-4 py-3">Record Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-400/10 text-sm">
              {visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    Catalog is empty. Load the demo catalog or add a lowercase word above.
                  </td>
                </tr>
              ) : (
                visibleRecords.map((rec) => {
                  const isDup = (duplicateTitles.get(rec.title) ?? 0) > 1;
                  return (
                    <tr key={rec.id} className="transition-colors hover:bg-violet-400/5">
                      <td className="tabular-nums px-4 py-3 font-mono text-cyan-300">#{rec.id}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-white">{rec.title}</td>
                      <td className="tabular-nums px-4 py-3 text-slate-300">Order {rec.order}</td>
                      <td className="px-4 py-3 text-xs">
                        {isDup ? (
                          <span className="text-violet-200">Duplicate title · distinct ID</span>
                        ) : (
                          <span className="text-slate-400">Unique title</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
