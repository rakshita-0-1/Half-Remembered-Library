import { useState } from 'react';
import { ArrowRight, BookOpen, Search } from 'lucide-react';
import type { LibraryState, PageId } from '../types';

interface HomePageProps {
  state: LibraryState;
  onNavigate: (page: PageId) => void;
}

const HERO_IMAGE_PATH = '/src/assets/images/hero_digital_library_1795669998540.jpg';

export function HomePage({ state, onNavigate }: HomePageProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
        {/* Left: Editorial Hero Copy */}
        <div className="flex flex-col justify-center lg:col-span-7">
          <p className="mb-3 text-sm font-medium tracking-wide text-cyan-300">
            Partial-Title Retrieval System · C Suffix-Separator Trie
          </p>

          <h1
            className="max-w-2xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.35rem] lg:leading-[1.08]"
            style={{ textWrap: 'balance' }}
          >
            THE HALF-REMEMBERED LIBRARY
          </h1>

          <p className="mt-4 text-lg font-medium text-violet-200 sm:text-xl">
            "Remember the beginning. Recall the ending. We'll find the story."
          </p>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
            Recall only the opening and closing letters of a book title? Enter your{' '}
            <strong className="font-semibold text-white">prefix</strong> and{' '}
            <strong className="font-semibold text-white">suffix</strong> clues. Our pure C
            27-child Trie indexes every suffix with a <code className="text-cyan-300">#</code>{' '}
            separator so the latest matching record is retrieved in{' '}
            <code className="text-cyan-300">O(P + S)</code> time without scanning the catalog.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('search')}
              className="inline-flex cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-6 py-3.5 text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span>Start Searching</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('about')}
              className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-violet-300/25 bg-white/5 px-5 py-3.5 text-base font-medium text-slate-100 transition-colors duration-150 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
            >
              <span>How It Works</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Right: Hero Visual Illustration */}
        <div className="glass-panel flex flex-col overflow-hidden rounded-2xl lg:col-span-5">
          <div className="relative flex-1 overflow-hidden bg-[#0a1026]">
            {!imgFailed ? (
              <img
                src={HERO_IMAGE_PATH}
                alt="Illuminated open book beneath a glowing constellation of Trie search nodes"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="h-full min-h-[260px] w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center bg-gradient-to-br from-[#0e1738] to-[#1d1445] p-8 text-center">
                <BookOpen className="mb-3 h-14 w-14 text-cyan-300" />
                <p className="font-mono text-sm text-violet-200">
                  suffix + '#' + prefix → maxId
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-violet-300/15 px-5 py-3 text-xs text-slate-300">
            <span className="font-mono">
              Query: <span className="text-cyan-300">og#cat</span>
            </span>
            <span>27-Child C Trie Index</span>
          </div>
        </div>
      </div>

      {/* Full-Width 4-Column Live Statistics Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400">Catalog Records</p>
          <p className="tabular-nums mt-2 text-3xl font-bold text-white">
            {state.catalogCount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-400">Capacity: 1,000 lowercase titles</p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400">Indexed Titles</p>
          <p className="tabular-nums mt-2 text-3xl font-bold text-white">
            {state.indexedCount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-400">Stored in C suffix Trie</p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400">Search Queries Processed</p>
          <p className="tabular-nums mt-2 text-3xl font-bold text-white">
            {state.queriesProcessed.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-400">Limit: 2,000 tracked queries</p>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400">Index Status</p>
          <p
            className={`mt-2 text-2xl font-bold ${
              state.isIndexed ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {state.isIndexed ? 'Ready' : 'Needs Build'}
          </p>
          <p className="tabular-nums mt-1 text-xs text-slate-400">
            {state.trieNodeCount.toLocaleString()} Trie nodes allocated
          </p>
        </div>
      </div>
    </div>
  );
}
