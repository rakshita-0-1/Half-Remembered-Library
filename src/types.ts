export type PageId = 'home' | 'search' | 'catalog' | 'indexing' | 'about';

export interface CatalogRecord {
  id: number;
  order: number;
  title: string;
}

export interface SearchHistoryEntry {
  index: number;
  prefix: string;
  suffix: string;
  resultId: number;
  resultTitle: string;
  steps: number;
  timeUs: number;
}

export interface LibraryState {
  catalogCount: number;
  isIndexed: boolean;
  indexedCount: number;
  trieNodeCount: number;
  indexBuildTimeMs: number;
  queriesProcessed: number;
  historyCount: number;
  catalog: CatalogRecord[];
  history: SearchHistoryEntry[];
}

export interface SearchResponse extends Partial<LibraryState> {
  ok: boolean;
  code: number;
  resultId: number;
  resultTitle: string;
  steps: number;
  timeUs: number;
  error?: string;
}
