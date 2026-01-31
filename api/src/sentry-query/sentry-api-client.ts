/**
 * Sentry API Client
 *
 * Makes authenticated requests to the Sentry REST API.
 * Handles authentication, pagination, rate limiting, and error responses.
 */

import axios, { AxiosError } from 'axios';

export type SentryEndpoint = 'issues' | 'events' | 'projects';
export type SentryRegion = 'us' | 'de' | 'default';

export interface SentryQueryRequest {
  org: string;
  authToken: string;
  endpoint: SentryEndpoint;
  query?: string;
  environment?: string;
  project?: string;
  statsPeriod?: string;
  region?: SentryRegion;
  cursor?: string;
}

export interface PaginationInfo {
  hasNext: boolean;
  hasPrevious: boolean;
  nextCursor?: string;
  previousCursor?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset?: number;
}

export interface SentryQueryResponse {
  success: boolean;
  data?: any[];
  count?: number;
  error?: string;
  statusCode?: number;
  rateLimited?: boolean;
  generatedUrl: string;
  generatedCurl: string;
  pagination?: PaginationInfo;
  rateLimit?: RateLimitInfo;
  responseTime?: number;
}

interface CurlOptions {
  maskToken?: boolean;
}

/**
 * Get the base URL for a Sentry region
 */
function getBaseUrl(region?: SentryRegion): string {
  switch (region) {
    case 'us':
      return 'https://us.sentry.io';
    case 'de':
      return 'https://de.sentry.io';
    default:
      return 'https://sentry.io';
  }
}

/**
 * Build the API URL for a Sentry query
 */
export function buildApiUrl(request: SentryQueryRequest): string {
  const baseUrl = getBaseUrl(request.region);
  let path: string;

  switch (request.endpoint) {
    case 'issues':
      path = `/api/0/organizations/${request.org}/issues/`;
      break;
    case 'events':
      if (!request.project) {
        throw new Error('Project is required for events endpoint');
      }
      path = `/api/0/projects/${request.org}/${request.project}/events/`;
      break;
    case 'projects':
      path = `/api/0/organizations/${request.org}/projects/`;
      break;
    default:
      throw new Error(`Unknown endpoint: ${request.endpoint}`);
  }

  const url = new URL(path, baseUrl);

  // Add query parameters
  if (request.query) {
    url.searchParams.set('query', request.query);
  }
  if (request.environment) {
    url.searchParams.set('environment', request.environment);
  }
  if (request.statsPeriod) {
    url.searchParams.set('statsPeriod', request.statsPeriod);
  }
  if (request.project && request.endpoint === 'issues') {
    url.searchParams.set('project', request.project);
  }
  if (request.cursor) {
    url.searchParams.set('cursor', request.cursor);
  }

  return url.toString();
}

/**
 * Generate a cURL command for a Sentry API request
 */
export function generateCurlCommand(
  request: SentryQueryRequest,
  options: CurlOptions = {}
): string {
  const url = buildApiUrl(request);
  const token = options.maskToken ? '***' : request.authToken;

  return `curl -H "Authorization: Bearer ${token}" "${url}"`;
}

/**
 * Parse Link header for pagination info
 */
function parseLinkHeader(linkHeader: string): PaginationInfo {
  const info: PaginationInfo = {
    hasNext: false,
    hasPrevious: false,
  };

  // Parse Link header format:
  // <url>; rel="next"; results="true"; cursor="0:100:0", <url>; rel="previous"; results="false"; cursor="0:0:1"
  const links = linkHeader.split(',');

  for (const link of links) {
    const parts = link.trim().split(';');
    if (parts.length < 2) continue;

    const relMatch = link.match(/rel="(\w+)"/);
    const resultsMatch = link.match(/results="(\w+)"/);
    const cursorMatch = link.match(/cursor="([^"]+)"/);

    if (!relMatch) continue;

    const rel = relMatch[1];
    const hasResults = resultsMatch ? resultsMatch[1] === 'true' : false;
    const cursor = cursorMatch ? cursorMatch[1] : undefined;

    if (rel === 'next') {
      info.hasNext = hasResults;
      info.nextCursor = cursor;
    } else if (rel === 'previous') {
      info.hasPrevious = hasResults;
      info.previousCursor = cursor;
    }
  }

  return info;
}

/**
 * Parse rate limit headers
 */
function parseRateLimitHeaders(headers: Record<string, any>): RateLimitInfo | undefined {
  const limit = headers['x-sentry-rate-limit-limit'];
  const remaining = headers['x-sentry-rate-limit-remaining'];
  const reset = headers['x-sentry-rate-limit-reset'];

  if (!limit && !remaining) {
    return undefined;
  }

  return {
    limit: parseInt(limit, 10) || 0,
    remaining: parseInt(remaining, 10) || 0,
    reset: reset ? parseInt(reset, 10) : undefined,
  };
}

/**
 * Execute a query against the Sentry API
 */
export async function querySentryAPI(
  request: SentryQueryRequest
): Promise<SentryQueryResponse> {
  // Validate request
  if (request.endpoint === 'events' && !request.project) {
    return {
      success: false,
      error: 'Project is required for events endpoint',
      generatedUrl: '',
      generatedCurl: '',
    };
  }

  let url: string;
  try {
    url = buildApiUrl(request);
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      generatedUrl: '',
      generatedCurl: '',
    };
  }

  const curl = generateCurlCommand(request, { maskToken: true });
  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${request.authToken}`,
      },
      timeout: 30000, // 30 second timeout
    });

    const responseTime = Date.now() - startTime;
    const data = Array.isArray(response.data) ? response.data : [response.data];

    // Parse pagination from Link header
    const linkHeader = response.headers['link'];
    const pagination = linkHeader ? parseLinkHeader(linkHeader) : undefined;

    // Parse rate limit info
    const rateLimit = parseRateLimitHeaders(response.headers);

    return {
      success: true,
      data,
      count: data.length,
      statusCode: response.status,
      generatedUrl: url,
      generatedCurl: curl,
      pagination,
      rateLimit,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        const status = axiosError.response.status;
        const detail = (axiosError.response.data as any)?.detail || '';

        switch (status) {
          case 401:
            return {
              success: false,
              error: `Unauthorized: ${detail || 'Invalid or expired token'}`,
              statusCode: 401,
              generatedUrl: url,
              generatedCurl: curl,
              responseTime,
            };

          case 403:
            return {
              success: false,
              error: `Forbidden: ${detail || 'You do not have permission to access this resource'}`,
              statusCode: 403,
              generatedUrl: url,
              generatedCurl: curl,
              responseTime,
            };

          case 404:
            return {
              success: false,
              error: `Not found: ${detail || 'Resource not found'}`,
              statusCode: 404,
              generatedUrl: url,
              generatedCurl: curl,
              responseTime,
            };

          case 429:
            return {
              success: false,
              error: `Rate limit exceeded: ${detail || 'Too many requests'}`,
              statusCode: 429,
              rateLimited: true,
              rateLimit: parseRateLimitHeaders(axiosError.response.headers),
              generatedUrl: url,
              generatedCurl: curl,
              responseTime,
            };

          default:
            return {
              success: false,
              error: `API error (${status}): ${detail || axiosError.message}`,
              statusCode: status,
              generatedUrl: url,
              generatedCurl: curl,
              responseTime,
            };
        }
      }

      // Network error
      if (axiosError.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'Network error: Connection refused',
          generatedUrl: url,
          generatedCurl: curl,
          responseTime,
        };
      }

      if (axiosError.code === 'ENOTFOUND') {
        return {
          success: false,
          error: 'Network error: Host not found',
          generatedUrl: url,
          generatedCurl: curl,
          responseTime,
        };
      }

      if (axiosError.code === 'ETIMEDOUT') {
        return {
          success: false,
          error: 'Network error: Request timed out',
          generatedUrl: url,
          generatedCurl: curl,
          responseTime,
        };
      }

      return {
        success: false,
        error: `Network error: ${axiosError.message}`,
        generatedUrl: url,
        generatedCurl: curl,
        responseTime,
      };
    }

    return {
      success: false,
      error: `Unexpected error: ${error.message}`,
      generatedUrl: url,
      generatedCurl: curl,
      responseTime,
    };
  }
}
