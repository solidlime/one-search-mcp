/**
 * Application-wide constants
 * Centralizes magic numbers and string literals
 */

// Timeout values (milliseconds)
export const TIMEOUTS = {
  /** Default browser operation timeout */
  DEFAULT_BROWSER: 30_000,
  /** Default API request timeout */
  DEFAULT_API: 10_000,
  /** SSE keep-alive interval to prevent proxy timeouts */
  SSE_KEEP_ALIVE_INTERVAL: 25_000,
  /** Default session timeout (minutes) */
  DEFAULT_SESSION_TIMEOUT_MINUTES: 10,
} as const;

// Search defaults
export const SEARCH_DEFAULTS = {
  LIMIT: 10,
  CATEGORIES: 'general',
  FORMAT: 'json',
  LANGUAGE: 'auto',
  TIME_RANGE: '',
  SAFE_SEARCH: 0,
  ENGINES: 'all',
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
} as const;

// Server configuration
export const SERVER = {
  DEFAULT_VERSION: '1.2.0',
  DEFAULT_API_PORT: 8000,
  MAX_REQUEST_SIZE: '50mb',
} as const;

// Content limits
export const CONTENT_LIMITS = {
  /** No limit by default */
  DEFAULT_MAX_LENGTH: 0,
  /** Unlimited */
  UNLIMITED: 0,
} as const;

// Safe search type mapping
// Maps numeric values to SafeSearchType enum values
export const SAFE_SEARCH_TYPES = {
  STRICT: 0,
  MODERATE: 1,
  OFF: 2,
} as const;
