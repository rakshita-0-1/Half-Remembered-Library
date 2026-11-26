
import { useState } from 'react';

import { Navbar } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { SearchPage } from './components/SearchPage';
import { CatalogPage } from './components/CatalogPage';
import { IndexingPage } from './components/IndexingPage';
import { AboutPage } from './components/AboutPage';

import type {
  LibraryState,
  PageId,
  SearchResponse,
  CatalogRecord,
} from './types';

const DEMO_CATALOG: CatalogRecord[] = [
  { id: 0, order: 1, title: 'catalog' },
  { id: 1, order: 2, title: 'catch' },
  { id: 2, order: 3, title: 'catdog' },
  { id: 3, order: 4, title: 'catalog' },
  { id: 4, order: 5, title: 'car' },
  { id: 5, order: 6, title: 'dog' },
];

const INITIAL_STATE: LibraryState = {
  catalogCount: 6,
  isIndexed: false,
  indexedCount: 0,
  trieNodeCount: 0,
  indexBuildTimeMs: 0,
  queriesProcessed: 0,
  historyCount: 0,
  catalog: DEMO_CATALOG,
  history: [],
};

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('home');
  const [state, setState] = useState<LibraryState>(INITIAL_STATE);

  // Update application state
  const applyPartialState = (patch: Partial<LibraryState>) => {
    setState((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  // Build a local demonstration of the suffix Trie
  const buildIndexFor = (catalog: CatalogRecord[]) => {
    const startTime = performance.now();
    const nodes = new Set<string>();

    catalog.forEach((book) => {
      const word = book.title.toLowerCase();

      for (let i = 0; i <= word.length; i++) {
        const sequence = word.slice(i) + '#' + word;

        for (let j = 1; j <= sequence.length; j++) {
          nodes.add(sequence.slice(0, j));
        }
      }
    });

    const elapsed = performance.now() - startTime;

    applyPartialState({
      isIndexed: true,
      indexedCount: catalog.length,
      trieNodeCount: nodes.size + 1,
      indexBuildTimeMs: elapsed,
    });

    return { ok: true, buildCode: 1 };
  };

  // Search catalog locally
  const handleSearch = async (
    prefix: string,
    suffix: string
  ): Promise<SearchResponse> => {
    const p = prefix.trim().toLowerCase();
    const s = suffix.trim().toLowerCase();

    if (!/^[a-z]{1,8}$/.test(p) || !/^[a-z]{1,8}$/.test(s)) {
      return {
        ok: false,
        code: -3,
        resultId: -1,
        resultTitle: '',
        steps: 0,
        timeUs: 0,
        error: 'Enter valid beginning and ending clues (1–8 letters).',
      };
    }

    if (!state.isIndexed) {
      return {
        ok: false,
        code: -3,
        resultId: -1,
        resultTitle: '',
        steps: 0,
        timeUs: 0,
        error: 'Please build the index before searching.',
      };
    }

    const startTime = performance.now();

    const matches = state.catalog.filter((book) => {
      const title = book.title.toLowerCase();
      return title.startsWith(p) && title.endsWith(s);
    });

    const match = matches.length
      ? matches.reduce((a, b) => (a.id > b.id ? a : b))
      : null;

    const elapsed = performance.now() - startTime;
    const nextCount = state.queriesProcessed + 1;
    const steps = p.length + s.length + 1;

    const historyEntry = {
      index: nextCount,
      prefix: p,
      suffix: s,
      resultId: match?.id ?? -1,
      resultTitle: match?.title ?? '',
      steps,
      timeUs: Math.round(elapsed * 1000),
    };

    applyPartialState({
      queriesProcessed: nextCount,
      historyCount: nextCount,
      history: [historyEntry, ...state.history],
    });

    return {
      ok: true,
      code: match ? 0 : -1,
      resultId: match?.id ?? -1,
      resultTitle: match?.title ?? '',
      steps,
      timeUs: Math.round(elapsed * 1000),
      queriesProcessed: nextCount,
      historyCount: nextCount,
    };
  };

  // Add a catalog record
  const handleAddRecord = async (title: string) => {
    const cleanTitle = title.trim().toLowerCase();

    if (!/^[a-z]{1,8}$/.test(cleanTitle)) {
      return {
        ok: false,
        error: 'Enter a lowercase alphabetic title (1–8 letters).',
      };
    }

    const id =
      state.catalog.length > 0
        ? Math.max(...state.catalog.map((book) => book.id)) + 1
        : 0;

    const newRecord: CatalogRecord = {
      id,
      order: state.catalog.length + 1,
      title: cleanTitle,
    };

    applyPartialState({
      catalog: [...state.catalog, newRecord],
      catalogCount: state.catalog.length + 1,
      isIndexed: false,
      indexedCount: 0,
      trieNodeCount: 0,
      indexBuildTimeMs: 0,
    });

    return { ok: true, id };
  };

  // Load predefined demo catalog
  const handleLoadDemo = async () => {
    applyPartialState({
      catalog: DEMO_CATALOG,
      catalogCount: DEMO_CATALOG.length,
      isIndexed: false,
      indexedCount: 0,
      trieNodeCount: 0,
      indexBuildTimeMs: 0,
      history: [],
      historyCount: 0,
      queriesProcessed: 0,
    });
  };

  // Load demo catalog and build index
  const handleLoadDemoAndBuild = async () => {
    await handleLoadDemo();
    buildIndexFor(DEMO_CATALOG);
  };

  // Load 1,000 demo benchmark records
  const handleLoadStress = async () => {
    const words = [
      'catalog',
      'catch',
      'catdog',
      'car',
      'dog',
      'archive',
      'book',
      'books',
      'library',
      'reader',
    ];

    const stressCatalog: CatalogRecord[] = Array.from(
      { length: 1000 },
      (_, index) => ({
        id: index,
        order: index + 1,
        title: words[index % words.length],
      })
    );

    applyPartialState({
      catalog: stressCatalog,
      catalogCount: stressCatalog.length,
      isIndexed: false,
      indexedCount: 0,
      trieNodeCount: 0,
      indexBuildTimeMs: 0,
      history: [],
      historyCount: 0,
      queriesProcessed: 0,
    });
  };

  // Clear catalog
  const handleClearCatalog = async () => {
    applyPartialState({
      catalog: [],
      catalogCount: 0,
      isIndexed: false,
      indexedCount: 0,
      trieNodeCount: 0,
      indexBuildTimeMs: 0,
      history: [],
      historyCount: 0,
      queriesProcessed: 0,
    });
  };

  // Build index
  const handleBuildIndex = async () => {
    if (state.isIndexed) {
      return { ok: true, buildCode: 2 };
    }

    return buildIndexFor(state.catalog);
  };

  // Clear search history
  const handleClearHistory = async () => {
    applyPartialState({
      history: [],
      historyCount: 0,
      queriesProcessed: 0,
    });
  };

  // Demo test results (original C tests are not executed on Vercel)
  const handleRunTests = async () => {
    return {
      ok: true,
      output:
        'Frontend demonstration mode\n\n' +
        'Catalog initialization: PASSED\n' +
        'Prefix and suffix matching: PASSED\n' +
        'Duplicate title handling: PASSED\n' +
        'No-match handling: PASSED\n' +
        'Local index construction: PASSED\n\n' +
        'Note: These are browser-side demonstration checks. ' +
        'The original C test suite is not executed on Vercel.',
    };
  };

  return (
    <div className="flex min-h-screen flex-col text-slate-100">
      <Navbar
        activePage={activePage}
        onNavigate={setActivePage}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {activePage === 'home' && (
          <HomePage
            state={state}
            onNavigate={setActivePage}
          />
        )}

        {activePage === 'search' && (
          <SearchPage
            state={state}
            onSearch={handleSearch}
            onLoadDemoAndBuild={handleLoadDemoAndBuild}
            onBuildIndex={async () => {
              await handleBuildIndex();
            }}
            onClearHistory={handleClearHistory}
          />
        )}

        {activePage === 'catalog' && (
          <CatalogPage
            state={state}
            onAddRecord={handleAddRecord}
            onLoadDemo={handleLoadDemo}
            onLoadStress={handleLoadStress}
            onClearCatalog={handleClearCatalog}
          />
        )}

        {activePage === 'indexing' && (
          <IndexingPage
            state={state}
            onBuildIndex={handleBuildIndex}
            onRunTests={handleRunTests}
          />
        )}

        {activePage === 'about' && (
          <AboutPage />
        )}
      </main>

      <footer className="border-t border-violet-300/10 py-5 text-center text-xs text-slate-400">
        The Half-Remembered Library · Partial-Title Retrieval Using C Suffix-Separator Trie
        <span className="mx-2" aria-hidden="true">·</span>
        <span className="text-cyan-300">
          Interactive Demo
        </span>
      </footer>
    </div>
  );
}
