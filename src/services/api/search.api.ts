import { api } from '../../lib/api';
import type { SearchResponse } from '../../types/search';

export const searchApi = {
  search: (query: string, signal?: AbortSignal) =>
    api.get<SearchResponse>(`/search?q=${encodeURIComponent(query)}`, { signal }),
};
