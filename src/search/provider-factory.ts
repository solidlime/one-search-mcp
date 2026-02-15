/**
 * Search provider factory and strategy pattern implementation
 * Eliminates the large switch statement in processSearch()
 */

import { SafeSearchType } from 'duck-duck-scrape';
import { ISearchRequestOptions, ISearchResponse, SearchProvider } from '../interface.js';
import {
  bingSearch,
  duckDuckGoSearch,
  searxngSearch,
  tavilySearch,
  localSearch,
  googleSearch,
  zhipuSearch,
  exaSearch,
  bochaSearch,
} from './index.js';
import { getSearchDefaultConfig } from '../config.js';
import { SAFE_SEARCH_TYPES } from '../constants.js';

/**
 * Type-safe safe search conversion
 * Maps numeric safe search value to SafeSearchType enum
 */
function getSafeSearchType(value: number | string | undefined): SafeSearchType {
  const numericValue = typeof value === 'string' ? parseInt(value, 10) : (value ?? SAFE_SEARCH_TYPES.OFF);

  // Boundary check to prevent array index out of bounds
  if (numericValue === SAFE_SEARCH_TYPES.STRICT) return SafeSearchType.STRICT;
  if (numericValue === SAFE_SEARCH_TYPES.MODERATE) return SafeSearchType.MODERATE;
  return SafeSearchType.OFF;
}

/**
 * Search provider strategy interface
 */
type SearchStrategy = (options: ISearchRequestOptions) => Promise<ISearchResponse>;

/**
 * Create search strategy for each provider
 */
function createSearchStrategy(provider: SearchProvider, config: { apiKey?: string; apiUrl?: string }): SearchStrategy {
  const defaultConfig = getSearchDefaultConfig();

  switch (provider) {
    case 'searxng':
      return async (options: ISearchRequestOptions) => {
        const params = {
          ...defaultConfig,
          ...options,
          apiKey: config.apiKey,
        };

        // Environment variables have higher priority for categories and language
        const { categories, language } = defaultConfig;
        if (categories) params.categories = categories;
        if (language) params.language = language;

        return await searxngSearch(params);
      };

    case 'tavily':
      return async (options: ISearchRequestOptions) =>
        await tavilySearch({
          ...defaultConfig,
          ...options,
          apiKey: config.apiKey,
        });

    case 'bing':
      return async (options: ISearchRequestOptions) =>
        await bingSearch({
          ...defaultConfig,
          ...options,
          apiKey: config.apiKey,
        });

    case 'duckduckgo':
      return async (options: ISearchRequestOptions) => {
        const safeSearch = getSafeSearchType(options.safeSearch);
        return await duckDuckGoSearch({
          ...defaultConfig,
          ...options,
          apiKey: config.apiKey,
          safeSearch,
        });
      };

    case 'local':
      return async (options: ISearchRequestOptions) =>
        await localSearch({
          ...defaultConfig,
          ...options,
        });

    case 'google':
      return async (options: ISearchRequestOptions) =>
        await googleSearch({
          ...defaultConfig,
          ...options,
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
        });

    case 'zhipu':
      return async (options: ISearchRequestOptions) =>
        await zhipuSearch({
          ...defaultConfig,
          ...options,
          apiKey: config.apiKey,
        });

    case 'exa':
      return async (options: ISearchRequestOptions) =>
        await exaSearch({
          ...defaultConfig,
          ...options,
          apiKey: config.apiKey,
        });

    case 'bocha':
      return async (options: ISearchRequestOptions) =>
        await bochaSearch({
          ...defaultConfig,
          ...options,
          apiKey: config.apiKey,
        });

    default:
      throw new Error(`Unsupported search provider: ${provider as string}`);
  }
}

/**
 * Search provider registry (singleton pattern)
 */
class SearchProviderRegistry {
  private strategies = new Map<string, SearchStrategy>();

  /**
   * Get or create search strategy for a provider
   */
  getStrategy(provider: SearchProvider, config: { apiKey?: string; apiUrl?: string }): SearchStrategy {
    const cacheKey = `${provider}:${config.apiKey || ''}:${config.apiUrl || ''}`;

    let strategy = this.strategies.get(cacheKey);
    if (!strategy) {
      strategy = createSearchStrategy(provider, config);
      this.strategies.set(cacheKey, strategy);
    }

    return strategy;
  }

  /**
   * Clear cached strategies (useful for testing)
   */
  clear(): void {
    this.strategies.clear();
  }
}

// Export singleton instance
export const searchProviderRegistry = new SearchProviderRegistry();

/**
 * Execute search using the appropriate provider strategy
 */
export async function executeSearch(
  provider: SearchProvider,
  options: ISearchRequestOptions,
  config: { apiKey?: string; apiUrl?: string },
): Promise<ISearchResponse> {
  const strategy = searchProviderRegistry.getStrategy(provider, config);
  return await strategy(options);
}
