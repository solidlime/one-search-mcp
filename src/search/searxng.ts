import url from 'node:url';
import { ISearchRequestOptions, ISearchResponse, ISearchResponseResult } from '../interface.js';
import { searchLogger } from './logger.js';

/**
 * SearxNG Search API
 * @reference https://docs.searxng.org/dev/search_api.html
 */
export async function searxngSearch(params: ISearchRequestOptions): Promise<ISearchResponse> {
  const {
    query,
    page = 1,
    limit = 10,
    categories = 'general',
    engines = 'all',
    safeSearch = 0,
    format = 'json',
    language = 'auto',
    timeRange = '',
    timeout = 10000,
    apiKey,
    apiUrl,
    userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  } = params;

  if (!query?.trim()) {
    throw new Error('Query cannot be empty');
  }

  if (!apiUrl) {
    throw new Error('SearxNG API URL is required');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Number(timeout));

  try {
    const startTime = Date.now();

    const config = {
      q: query,
      pageno: page,
      categories,
      format,
      safesearch: safeSearch,
      language,
      engines,
      time_range: timeRange,
    };

    const endpoint = `${apiUrl}/search`;

    const queryParams = url.format({ query: config });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    searchLogger.info({
      endpoint: `${endpoint}${queryParams}`,
      timeout,
      engines,
    }, 'SearXNG request starting');

    const res = await fetch(`${endpoint}${queryParams}`, {
      method: 'POST',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const elapsed = Date.now() - startTime;
    searchLogger.info({
      status: res.status,
      statusText: res.statusText,
      elapsed: `${elapsed}ms`,
      contentType: res.headers.get('content-type'),
    }, 'SearXNG response received');

    // Check response status
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unable to read error response');
      throw new Error(`SearXNG returned ${res.status} ${res.statusText}: ${errorText.substring(0, 200)}`);
    }

    const response = await res.json();

    if (response.results) {
      searchLogger.info({
        resultCount: response.results.length,
        elapsed: `${Date.now() - startTime}ms`,
      }, 'SearXNG search completed');

      const list = (response.results as Array<Record<string, any>>).slice(0, limit);
      const results: ISearchResponseResult[] = list.map((item: Record<string, any>) => {
        const image = item.img_src ? {
          thumbnail: item.thumbnail_src,
          src: item.img_src,
        } : null;
        const video = item.iframe_src ? {
          thumbnail: item.thumbnail_src,
          src: item.iframe_src,
        } : null;
        return {
          title: item.title,
          snippet: item.content,
          url: item.url,
          source: item.source,
          image,
          video,
          engine: item.engine,
        };
      });
      return {
        results,
        success: true,
      };
    }

    // No results or error response from SearXNG
    searchLogger.warn({
      response: JSON.stringify(response).substring(0, 500),
      apiUrl,
      query,
    }, 'SearXNG returned no results');

    return {
      results: [],
      success: false,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    let errorType = 'Unknown';
    let errorDetails = '';

    if (err instanceof Error) {
      errorType = err.name;

      // Detect timeout
      if (err.name === 'AbortError' || err.message.includes('aborted')) {
        errorDetails = `Request timeout after ${timeout}ms. SearXNG server may be slow or overloaded.`;
      }
      // Detect network errors
      else if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
        errorDetails = `Network connection failed. Check if SearXNG server (${apiUrl}) is accessible.`;
      }
      // Detect DNS errors
      else if (err.message.includes('getaddrinfo')) {
        errorDetails = `DNS resolution failed for ${apiUrl}. Check the hostname.`;
      }
      else {
        errorDetails = err.message;
      }
    } else {
      errorDetails = String(err);
    }

    searchLogger.error({
      error: errorDetails,
      errorType,
      apiUrl,
      query,
      timeout: `${timeout}ms`,
      engines,
      cause: err instanceof Error && 'cause' in err ? err.cause : undefined,
    }, 'SearXNG API request failed');

    throw new Error(`SearXNG search failed: ${errorDetails}`);
  }
}
