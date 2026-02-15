/**
 * Browser creation helpers
 * Centralizes AgentBrowser instantiation with consistent configuration
 */

import { AgentBrowser } from './libs/agent-browser/index.js';
import { getBrowserConfig } from './config.js';

/**
 * Browser creation options
 */
export interface BrowserOptions {
  headless?: boolean;
  timeout?: number;
}

/**
 * Create a new AgentBrowser instance with default configuration
 */
export function createBrowser(options?: BrowserOptions): AgentBrowser {
  const config = getBrowserConfig(options);

  return new AgentBrowser({
    headless: config.headless,
    timeout: config.timeout,
  });
}

/**
 * Execute a browser operation with automatic cleanup
 * Ensures browser is always closed, even if operation fails
 *
 * @param operation - Async function that receives a browser instance
 * @param options - Optional browser configuration
 * @returns Result of the operation
 */
export async function withBrowser<T>(
  operation: (browser: AgentBrowser) => Promise<T>,
  options?: BrowserOptions,
): Promise<T> {
  const browser = createBrowser(options);

  try {
    return await operation(browser);
  } finally {
    await browser.close();
  }
}
