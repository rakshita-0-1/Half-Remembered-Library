
import { useCallback, useEffect, useState } from 'react';

import { Navbar } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { SearchPage } from './components/SearchPage';
import { CatalogPage } from './components/CatalogPage';
import { IndexingPage } from './components/IndexingPage';
import { AboutPage } from './components/AboutPage';

import type { LibraryState, PageId, SearchResponse } from './types';

// Backend URL:
// Leave empty during local development.
// Set VITE_API_BASE_URL when the backend is hosted separately.
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/+$/, '');


const INITIAL_STATE: LibraryState = {
  catalogCount: 6,
  isIndexed: false,
  indexedCount: 0,
  trieNodeCount: 0,
  indexBuildTimeMs: 0,
  queriesProcessed: 0,
  historyCount: 0,
  catalog: [
    { id: 0, order: 1, title: 'catalog' },
    { id: 1, order: 2, title: 'catch' },
    { id: 2, order: 3, title: 'catdog' },
    { id: 3, order: 4, title: 'catalog' },
    { id: 4, order: 5, title: 'car' },
    { id: 5, order: 6, title: 'dog' },
  ],
  history: [],
};

// Common API response type
type ApiError = {
  ok?: boolean;
  error?: string;
};

// Reusable API request function
async function apiJson<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const apiUrl = `${API_BASE_URL}${url}`;

  let response: Response;

  try {
    response = await fetch(apiUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch (error) {
    throw new Error(
      `Unable to connect to the backend server. ${
        error instanceof Error ? error.message : 'Network error.'
      }`
    );
  }

  const responseText = await response.text();

  let data: T;

  try {
    data = JSON.parse(responseText) as T;
  } catch {
    throw new Error(
      `Invalid server response. HTTP status: ${response.status}.`
    );
  }

  if (!response.ok) {
    const errorData = data as ApiError;

    throw new Error(
      errorData.error ||
        `Backend request failed with HTTP ${response.status}.`
    );
  }

  return data;
}

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('home');

  const [state, setState] = useState<LibraryState>(INITIAL_STATE);

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch complete backend state
  const fetchFullState = useCallback(async () => {
    const data = await apiJson<
      LibraryState & {
        ok?: boolean;
        error?: string;
      }
    >('/api/state');

    if (data.ok === false) {
      throw new Error(
        data.error || 'Failed to load C backend state.'
      );
    }

    setState({
      catalogCount: data.catalogCount,
      isIndexed: data.isIndexed,
      indexedCount: data.indexedCount,
      trieNodeCount: data.trieNodeCount,
      indexBuildTimeMs: data.indexBuildTimeMs,
      queriesProcessed: data.queriesProcessed,
      historyCount: data.historyCount,
      catalog: data.catalog ?? [],
      history: data.history ?? [],
    });
  }, []);

  // Initialize application
  useEffect(() => {
    let cancelled = false;

    fetchFullState()
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Unknown backend connection error.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchFullState]);

  // Update only changed state values
  const applyPartialState = useCallback(
    (patch: Partial<LibraryState>) => {
      setState((prev) => ({
        catalogCount: patch.catalogCount ?? prev.catalogCount,
        isIndexed: patch.isIndexed ?? prev.isIndexed,
        indexedCount: patch.indexedCount ?? prev.indexedCount,
        trieNodeCount: patch.trieNodeCount ?? prev.trieNodeCount,
        indexBuildTimeMs:
          patch.indexBuildTimeMs ?? prev.indexBuildTimeMs,
        queriesProcessed:
          patch.queriesProcessed ?? prev.queriesProcessed,
        historyCount: patch.historyCount ?? prev.historyCount,
        catalog: patch.catalog ?? prev.catalog,
        history: patch.history ?? prev.history,
      }));
    },
    []
  );

  // Search catalog
  const handleSearch = async (
    prefix: string,
    suffix: string
  ): Promise<SearchResponse> => {
    const data = await apiJson<SearchResponse>('/api/search', {
      method: 'POST',
      body: JSON.stringify({ prefix, suffix }),
    });

    applyPartialState(data);

    return data;
  };

  // Add catalog record
  const handleAddRecord = async (title: string) => {
    const data = await apiJson<
      Partial<LibraryState> & {
        ok: boolean;
        id?: number;
        error?: string;
      }
    >('/api/catalog/add', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });

    applyPartialState(data);

    return data;
  };

  // Load demo catalog
  const handleLoadDemo = async () => {
    const data = await apiJson<Partial<LibraryState>>(
      '/api/catalog/demo',
      { method: 'POST' }
    );

    applyPartialState(data);
  };

  // Load demo and build index
  const handleLoadDemoAndBuild = async () => {
    await handleLoadDemo();
    await handleBuildIndex();
  };

  // Load stress-test catalog
  const handleLoadStress = async () => {
    const data = await apiJson<Partial<LibraryState>>(
      '/api/catalog/stress',
      { method: 'POST' }
    );

    applyPartialState(data);
  };

  // Clear catalog
  const handleClearCatalog = async () => {
    const data = await apiJson<Partial<LibraryState>>(
      '/api/catalog/clear',
      { method: 'POST' }
    );

    applyPartialState(data);
  };

  // Build Trie index
  const handleBuildIndex = async () => {
    const data = await apiJson<
      Partial<LibraryState> & {
        ok: boolean;
        buildCode?: number;
        error?: string;
      }
    >('/api/index/build', {
      method: 'POST',
    });

    applyPartialState(data);

    return data;
  };

  // Clear search history
  const handleClearHistory = async () => {
    const data = await apiJson<Partial<LibraryState>>(
      '/api/history/clear',
      { method: 'POST' }
    );

    applyPartialState(data);
  };

  // Run C backend tests
  const handleRunTests = async () => {
    return await apiJson<{
      ok: boolean;
      output?: string;
      error?: string;
    }>('/api/tests/run', {
      method: 'POST',
    });
  };

  return (
    <div className="flex min-h-screen flex-col text-slate-100">

      <Navbar
        activePage={activePage}
        onNavigate={setActivePage}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">

        {loadError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            Failed to connect to C backend: {loadError}
          </div>
        )}

        {loading ? (
          <div className="glass-panel rounded-2xl p-10 text-center text-sm text-slate-300">
            Initializing C Trie catalog engine...
          </div>
        ) : (
          <>
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
          </>
        )}

      </main>

      <footer className="border-t border-violet-300/10 py-5 text-center text-xs text-slate-400">

        <span>
          The Half-Remembered Library · Partial-Title Retrieval Using C Suffix-Separator Trie
        </span>

        <span className="mx-2" aria-hidden="true">
          ·
        </span>

        <a
          href={`${API_BASE_URL}/api/download`}
          download="half-remembered-library.zip"
          className="font-medium text-cyan-300 underline decoration-cyan-400/40 underline-offset-4 hover:text-cyan-200"
        >
          Download Project (.zip)
        </a>

      </footer>

    </div>
  );
}
