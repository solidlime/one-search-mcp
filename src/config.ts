/**
 * Centralized configuration management
 * Single source of truth for environment variable handling
 */

import { SearchProvider } from './interface.js';
import { SEARCH_DEFAULTS, TIMEOUTS, SERVER } from './constants.js';

/**
 * Search provider configuration
 */
export interface SearchConfig {
  provider: SearchProvider;
  apiUrl?: string;
  apiKey?: string;
}

/**
 * Search request default configuration
 */
export interface SearchDefaultConfig {
  limit: number;
  categories: string;
  format: string;
  safesearch: string | number;
  language: string;
  engines: string;
  time_range: string;
  timeout: number;
  userAgent: string;
}

/**
 * Browser configuration
 */
export interface BrowserConfig {
  headless: boolean;
  timeout: number;
}

/**
 * Session configuration
 */
export interface SessionConfig {
  timeoutMinutes: number;
  timeoutMs: number;
}

/**
 * Get search provider configuration
 * Can be overridden by HTTP headers in streamable-http mode
 */
export function getSearchConfig(): SearchConfig {
  return {
    provider: (process.env.SEARCH_PROVIDER as SearchProvider) ?? 'local',
    apiUrl: process.env.SEARCH_API_URL,
    apiKey: process.env.SEARCH_API_KEY,
  };
}

/**
 * Get search request defaults from environment variables
 */
export function getSearchDefaultConfig(): SearchDefaultConfig {
  return {
    limit: Number(process.env.LIMIT ?? SEARCH_DEFAULTS.LIMIT),
    categories: process.env.CATEGORIES ?? SEARCH_DEFAULTS.CATEGORIES,
    format: process.env.FORMAT ?? SEARCH_DEFAULTS.FORMAT,
    safesearch: process.env.SAFE_SEARCH ?? SEARCH_DEFAULTS.SAFE_SEARCH,
    language: process.env.LANGUAGE ?? SEARCH_DEFAULTS.LANGUAGE,
    engines: process.env.ENGINES ?? SEARCH_DEFAULTS.ENGINES,
    time_range: process.env.TIME_RANGE ?? SEARCH_DEFAULTS.TIME_RANGE,
    timeout: process.env.TIMEOUT ? Number(process.env.TIMEOUT) : TIMEOUTS.DEFAULT_API,
    userAgent: process.env.SEARCH_USER_AGENT ?? SEARCH_DEFAULTS.USER_AGENT,
  };
}

/**
 * Get browser configuration with defaults
 */
export function getBrowserConfig(options?: Partial<BrowserConfig>): BrowserConfig {
  return {
    headless: options?.headless ?? process.env.HEADLESS !== 'false',
    timeout: options?.timeout ?? TIMEOUTS.DEFAULT_BROWSER,
  };
}

/**
 * Get session timeout configuration
 */
export function getSessionConfig(): SessionConfig {
  const timeoutMinutes = parseInt(
    process.env.SESSION_TIMEOUT_MINUTES || String(TIMEOUTS.DEFAULT_SESSION_TIMEOUT_MINUTES),
    10,
  );

  return {
    timeoutMinutes,
    timeoutMs: timeoutMinutes * 60 * 1000,
  };
}

/**
 * Get API port from environment or default
 */
export function getApiPort(): number {
  return Number(process.env.API_PORT) || SERVER.DEFAULT_API_PORT;
}

/**
 * Get scrape max length from environment or default
 */
export function getScrapeMaxLength(override?: number): number {
  return override ?? Number(process.env.SCRAPE_MAX_LENGTH ?? 0);
}
