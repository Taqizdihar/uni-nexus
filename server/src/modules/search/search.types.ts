export type SearchResultType = 'craft_order' | 'studio_project' | 'craft_customer' | 'studio_client';

export interface SearchResultItem {
  type: SearchResultType;
  id: number;
  title: string;
  subtitle: string | null;
  route: string;
  module: string;
}

export interface SearchWorkspaceAccess {
  craft: boolean;
  studio: boolean;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  categories: Record<SearchResultType, number>;
}
