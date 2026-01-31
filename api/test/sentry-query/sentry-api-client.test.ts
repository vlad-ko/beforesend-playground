import axios, { AxiosError } from 'axios';
import {
  querySentryAPI,
  buildApiUrl,
  generateCurlCommand,
  SentryQueryRequest,
  SentryQueryResponse,
} from '../../src/sentry-query/sentry-api-client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Helper to create proper axios errors
function createAxiosError(status: number, data: any, headers: Record<string, string> = {}): AxiosError {
  const error = new Error(`Request failed with status code ${status}`) as AxiosError;
  error.isAxiosError = true;
  error.response = {
    status,
    data,
    headers,
    statusText: '',
    config: {} as any,
  };
  error.config = {} as any;
  error.toJSON = () => ({});
  return error;
}

function createNetworkError(code: string, message: string): AxiosError {
  const error = new Error(message) as AxiosError;
  error.isAxiosError = true;
  error.code = code;
  error.config = {} as any;
  error.toJSON = () => ({});
  return error;
}

describe('SentryAPIClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up isAxiosError to check the isAxiosError property
    (axios.isAxiosError as unknown as jest.Mock) = jest.fn((error: any) => error?.isAxiosError === true);
  });

  describe('buildApiUrl', () => {
    it('should build issues endpoint URL', () => {
      const url = buildApiUrl({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
      });
      expect(url).toBe('https://sentry.io/api/0/organizations/team-se-oi/issues/');
    });

    it('should build events endpoint URL', () => {
      const url = buildApiUrl({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'events',
        project: 'my-project',
      });
      expect(url).toBe(
        'https://sentry.io/api/0/projects/team-se-oi/my-project/events/'
      );
    });

    it('should build projects endpoint URL', () => {
      const url = buildApiUrl({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'projects',
      });
      expect(url).toBe('https://sentry.io/api/0/organizations/team-se-oi/projects/');
    });

    it('should include query parameter', () => {
      const url = buildApiUrl({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
        query: 'level:error is:unresolved',
      });
      // URL encoding may vary, check decoded value
      const urlObj = new URL(url);
      expect(urlObj.searchParams.get('query')).toBe('level:error is:unresolved');
    });

    it('should include environment parameter', () => {
      const url = buildApiUrl({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
        environment: 'production',
      });
      expect(url).toContain('environment=production');
    });

    it('should include statsPeriod parameter', () => {
      const url = buildApiUrl({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
        statsPeriod: '24h',
      });
      expect(url).toContain('statsPeriod=24h');
    });

    it('should include project parameter for issues', () => {
      const url = buildApiUrl({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
        project: '123456',
      });
      expect(url).toContain('project=123456');
    });

    it('should use region-specific domain for US', () => {
      const url = buildApiUrl({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
        region: 'us',
      });
      expect(url.startsWith('https://us.sentry.io/')).toBe(true);
    });

    it('should use region-specific domain for DE', () => {
      const url = buildApiUrl({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
        region: 'de',
      });
      expect(url.startsWith('https://de.sentry.io/')).toBe(true);
    });
  });

  describe('generateCurlCommand', () => {
    it('should generate basic cURL command', () => {
      const curl = generateCurlCommand({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
      });
      expect(curl).toContain('curl');
      expect(curl).toContain('-H "Authorization: Bearer test-token"');
      expect(curl).toContain(
        'https://sentry.io/api/0/organizations/team-se-oi/issues/'
      );
    });

    it('should mask auth token in cURL command', () => {
      const curl = generateCurlCommand(
        {
          org: 'team-se-oi',
          authToken: 'sntrys_token_12345',
          endpoint: 'issues',
        },
        { maskToken: true }
      );
      expect(curl).toContain('Bearer ***');
      expect(curl).not.toContain('sntrys_token_12345');
    });

    it('should include query in cURL command', () => {
      const curl = generateCurlCommand({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
        query: 'level:error',
      });
      expect(curl).toContain('query=');
    });
  });

  describe('querySentryAPI', () => {
    it('should make authenticated request', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: [{ id: '1', title: 'Test Issue' }],
        headers: {
          link: '<https://sentry.io/api/0/organizations/team-se-oi/issues/?cursor=1234>; rel="next"; results="true"',
          'x-sentry-rate-limit-limit': '100',
          'x-sentry-rate-limit-remaining': '99',
        },
      });

      const result = await querySentryAPI({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
        query: 'level:error',
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('organizations/team-se-oi/issues'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        })
      );
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should handle 401 unauthorized', async () => {
      mockedAxios.get.mockRejectedValueOnce(
        createAxiosError(401, { detail: 'Invalid token' })
      );

      const result = await querySentryAPI({
        org: 'team-se-oi',
        authToken: 'invalid-token',
        endpoint: 'issues',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
      expect(result.statusCode).toBe(401);
    });

    it('should handle 403 forbidden', async () => {
      mockedAxios.get.mockRejectedValueOnce(
        createAxiosError(403, { detail: 'You do not have permission' })
      );

      const result = await querySentryAPI({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Forbidden');
      expect(result.statusCode).toBe(403);
    });

    it('should handle 404 not found', async () => {
      mockedAxios.get.mockRejectedValueOnce(
        createAxiosError(404, { detail: 'Organization not found' })
      );

      const result = await querySentryAPI({
        org: 'unknown-org',
        authToken: 'test-token',
        endpoint: 'issues',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not found');
      expect(result.statusCode).toBe(404);
    });

    it('should handle 429 rate limited', async () => {
      mockedAxios.get.mockRejectedValueOnce(
        createAxiosError(429, { detail: 'Rate limit exceeded' }, {
          'retry-after': '60',
          'x-sentry-rate-limit-reset': '1234567890',
        })
      );

      const result = await querySentryAPI({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
      });

      expect(result.success).toBe(false);
      expect(result.rateLimited).toBe(true);
      expect(result.error).toContain('Rate limit');
      expect(result.statusCode).toBe(429);
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(
        createNetworkError('ECONNREFUSED', 'Connection refused')
      );

      const result = await querySentryAPI({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should generate correct cURL command in response', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: [],
        headers: {},
      });

      const result = await querySentryAPI({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
        query: 'level:error',
      });

      expect(result.generatedCurl).toBeDefined();
      expect(result.generatedCurl).toContain('curl');
      expect(result.generatedCurl).toContain('Bearer');
    });

    it('should include URL in response', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: [],
        headers: {},
      });

      const result = await querySentryAPI({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
      });

      expect(result.generatedUrl).toBeDefined();
      expect(result.generatedUrl).toContain('sentry.io');
    });

    it('should return count of results', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: [{ id: '1' }, { id: '2' }, { id: '3' }],
        headers: {},
      });

      const result = await querySentryAPI({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
      });

      expect(result.count).toBe(3);
    });

    it('should parse pagination from Link header', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: [{ id: '1' }],
        headers: {
          link: '<https://sentry.io/api/0/organizations/team-se-oi/issues/?cursor=0:100:0>; rel="next"; results="true"; cursor="0:100:0", <https://sentry.io/api/0/organizations/team-se-oi/issues/?cursor=0:0:1>; rel="previous"; results="false"; cursor="0:0:1"',
        },
      });

      const result = await querySentryAPI({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
      });

      expect(result.pagination).toBeDefined();
      expect(result.pagination?.hasNext).toBe(true);
      expect(result.pagination?.hasPrevious).toBe(false);
      expect(result.pagination?.nextCursor).toBe('0:100:0');
    });

    it('should include rate limit info in response', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: [],
        headers: {
          'x-sentry-rate-limit-limit': '100',
          'x-sentry-rate-limit-remaining': '95',
          'x-sentry-rate-limit-reset': '1234567890',
        },
      });

      const result = await querySentryAPI({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'issues',
      });

      expect(result.rateLimit).toBeDefined();
      expect(result.rateLimit?.limit).toBe(100);
      expect(result.rateLimit?.remaining).toBe(95);
    });
  });

  describe('endpoint-specific behavior', () => {
    it('should require project for events endpoint', async () => {
      const result = await querySentryAPI({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'events',
        // Missing project
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project');
    });

    it('should work for projects endpoint without project', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: [{ slug: 'my-project' }],
        headers: {},
      });

      const result = await querySentryAPI({
        org: 'team-se-oi',
        authToken: 'test-token',
        endpoint: 'projects',
      });

      expect(result.success).toBe(true);
    });
  });
});
