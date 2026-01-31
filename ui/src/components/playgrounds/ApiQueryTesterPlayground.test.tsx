import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApiQueryTesterPlayground from './ApiQueryTesterPlayground';
import { apiClient } from '../../api/client';

// Mock the API client
vi.mock('../../api/client', () => ({
  apiClient: {
    getSentryQueryExamples: vi.fn(),
    validateSentryQuery: vi.fn(),
    testSentryQuery: vi.fn(),
    parseSentryUrl: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient);

describe('ApiQueryTesterPlayground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiClient.getSentryQueryExamples.mockResolvedValue({
      examples: [
        {
          name: 'Unresolved Errors',
          description: 'Find unresolved error-level issues',
          query: 'is:unresolved level:error',
          category: 'basic',
        },
        {
          name: 'My Assigned',
          description: 'Issues assigned to me',
          query: 'assigned:me',
          category: 'basic',
        },
      ],
    });
    mockedApiClient.validateSentryQuery.mockResolvedValue({
      valid: true,
      components: [
        {
          component: { property: 'is', operator: ':', value: 'unresolved', raw: 'is:unresolved' },
          valid: true,
        },
      ],
      suggestions: [],
      parsed: { raw: 'is:unresolved', freeText: [] },
    });
  });

  it('renders query input and configuration', async () => {
    render(<ApiQueryTesterPlayground />);

    expect(screen.getByText('Search Query')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('is:unresolved level:error')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('demo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('sntrys_...')).toBeInTheDocument();
  });

  it('loads and displays example queries', async () => {
    render(<ApiQueryTesterPlayground />);

    await waitFor(() => {
      expect(screen.getByText('Unresolved Errors')).toBeInTheDocument();
      expect(screen.getByText('My Assigned')).toBeInTheDocument();
    });
  });

  it('validates query in real-time', async () => {
    const user = userEvent.setup();
    render(<ApiQueryTesterPlayground />);

    const queryInput = screen.getByPlaceholderText('is:unresolved level:error');
    await user.clear(queryInput);
    await user.type(queryInput, 'level:error');

    await waitFor(() => {
      expect(mockedApiClient.validateSentryQuery).toHaveBeenCalledWith('level:error');
    });
  });

  it('shows validation feedback for valid query', async () => {
    render(<ApiQueryTesterPlayground />);

    await waitFor(() => {
      expect(screen.getByText('Query is valid')).toBeInTheDocument();
    });
  });

  it('shows validation feedback for invalid properties', async () => {
    mockedApiClient.validateSentryQuery.mockResolvedValue({
      valid: false,
      components: [
        {
          component: { property: 'assignee', operator: ':', value: 'me', raw: 'assignee:me' },
          valid: false,
          error: 'Unknown property',
          suggestion: 'assigned',
        },
      ],
      suggestions: [{ original: 'assignee', suggested: 'assigned', reason: 'Did you mean assigned?' }],
      parsed: { raw: 'assignee:me', freeText: [] },
    });

    const user = userEvent.setup();
    render(<ApiQueryTesterPlayground />);

    const queryInput = screen.getByPlaceholderText('is:unresolved level:error');
    await user.clear(queryInput);
    await user.type(queryInput, 'assignee:me');

    await waitFor(() => {
      expect(screen.getByText('Query has issues')).toBeInTheDocument();
      expect(screen.getByText(/assigned/)).toBeInTheDocument();
    });
  });

  it('requires org and authToken to execute query', async () => {
    const user = userEvent.setup();
    render(<ApiQueryTesterPlayground />);

    // Try to execute without auth token
    const executeButton = screen.getByText('Execute Query');
    expect(executeButton).toBeDisabled();

    // Fill in auth token
    const tokenInput = screen.getByPlaceholderText('sntrys_...');
    await user.type(tokenInput, 'test-token');

    expect(executeButton).not.toBeDisabled();
  });

  it('executes query and displays results', async () => {
    mockedApiClient.testSentryQuery.mockResolvedValue({
      success: true,
      data: [{ id: '1', title: 'Test Issue' }],
      count: 1,
      generatedUrl: 'https://sentry.io/api/0/organizations/team-se-oi/issues/?query=level%3Aerror',
      generatedCurl: 'curl -H "Authorization: Bearer ***" "https://sentry.io/..."',
      responseTime: 150,
    });

    const user = userEvent.setup();
    render(<ApiQueryTesterPlayground />);

    // Fill in auth token
    const tokenInput = screen.getByPlaceholderText('sntrys_...');
    await user.type(tokenInput, 'test-token');

    // Execute query
    const executeButton = screen.getByText('Execute Query');
    await user.click(executeButton);

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('1 result')).toBeInTheDocument();
      expect(screen.getByText('150ms')).toBeInTheDocument();
    });
  });

  it('generates and displays cURL command', async () => {
    mockedApiClient.testSentryQuery.mockResolvedValue({
      success: true,
      data: [],
      count: 0,
      generatedUrl: 'https://sentry.io/api/0/organizations/team-se-oi/issues/',
      generatedCurl: 'curl -H "Authorization: Bearer ***" "https://sentry.io/api/0/organizations/team-se-oi/issues/"',
    });

    const user = userEvent.setup();
    render(<ApiQueryTesterPlayground />);

    const tokenInput = screen.getByPlaceholderText('sntrys_...');
    await user.type(tokenInput, 'test-token');

    const executeButton = screen.getByText('Execute Query');
    await user.click(executeButton);

    await waitFor(() => {
      expect(screen.getByText('cURL Command')).toBeInTheDocument();
      expect(screen.getByText(/curl -H/)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockedApiClient.testSentryQuery.mockResolvedValue({
      success: false,
      error: 'Unauthorized: Invalid token',
      statusCode: 401,
      generatedUrl: 'https://sentry.io/api/0/organizations/demo/issues/',
      generatedCurl: 'curl -H "Authorization: Bearer ***" "https://sentry.io/api/0/organizations/demo/issues/"',
    });

    const user = userEvent.setup();
    render(<ApiQueryTesterPlayground />);

    const tokenInput = screen.getByPlaceholderText('sntrys_...');
    await user.type(tokenInput, 'invalid-token');

    const executeButton = screen.getByText('Execute Query');
    await user.click(executeButton);

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText(/Unauthorized/)).toBeInTheDocument();
    });

    // Should show the URL even on error (in a pre tag)
    const urlPre = document.querySelector('pre');
    expect(urlPre?.textContent).toContain('sentry.io/api/0/organizations/demo/issues');

    // Should show troubleshooting tips for 401
    expect(screen.getByText(/Check that your auth token is valid/)).toBeInTheDocument();
  });

  it('shows troubleshooting tips for 404 errors', async () => {
    mockedApiClient.testSentryQuery.mockResolvedValue({
      success: false,
      error: 'Not found: Resource not found',
      statusCode: 404,
      generatedUrl: 'https://sentry.io/api/0/organizations/wrong-org/issues/',
      generatedCurl: 'curl -H "Authorization: Bearer ***" "https://sentry.io/api/0/organizations/wrong-org/issues/"',
    });

    const user = userEvent.setup();
    render(<ApiQueryTesterPlayground />);

    const tokenInput = screen.getByPlaceholderText('sntrys_...');
    await user.type(tokenInput, 'test-token');

    const executeButton = screen.getByText('Execute Query');
    await user.click(executeButton);

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText(/Not found/)).toBeInTheDocument();
    });

    // Should show troubleshooting tips for 404
    expect(screen.getByText(/Check that the organization slug/)).toBeInTheDocument();
    // Should show the URL that caused the error
    expect(screen.getByText(/this URL returned the error above/)).toBeInTheDocument();
  });

  it('parses Sentry URL and populates form', async () => {
    mockedApiClient.parseSentryUrl.mockResolvedValue({
      success: true,
      org: 'my-org',
      query: 'level:error',
      environment: 'production',
      project: '123',
      statsPeriod: '7d',
      endpoint: 'issues',
    });

    const user = userEvent.setup();
    render(<ApiQueryTesterPlayground />);

    // Open URL parser
    await user.click(screen.getByText('Load from URL'));

    // Enter URL
    const urlInput = screen.getByPlaceholderText(/https:\/\/demo.sentry.io/);
    await user.type(urlInput, 'https://my-org.sentry.io/issues/?query=level:error');

    // Parse
    await user.click(screen.getByText('Parse'));

    await waitFor(() => {
      const orgInput = screen.getByPlaceholderText('demo') as HTMLInputElement;
      expect(orgInput.value).toBe('my-org');
    });
  });

  it('selects example query and updates input', async () => {
    const user = userEvent.setup();
    render(<ApiQueryTesterPlayground />);

    await waitFor(() => {
      expect(screen.getByText('Unresolved Errors')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Unresolved Errors'));

    const queryInput = screen.getByPlaceholderText('is:unresolved level:error') as HTMLTextAreaElement;
    expect(queryInput.value).toBe('is:unresolved level:error');
  });

  it('toggles auth token visibility', async () => {
    const user = userEvent.setup();
    render(<ApiQueryTesterPlayground />);

    const tokenInput = screen.getByPlaceholderText('sntrys_...');
    expect(tokenInput).toHaveAttribute('type', 'password');

    // Find and click the toggle button (SVG icon button)
    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(btn => btn.querySelector('svg'));
    if (toggleButton) {
      await user.click(toggleButton);
      expect(tokenInput).toHaveAttribute('type', 'text');
    }
  });

  it('resets form to defaults', async () => {
    const user = userEvent.setup();
    render(<ApiQueryTesterPlayground />);

    // Modify org
    const orgInput = screen.getByPlaceholderText('demo') as HTMLInputElement;
    await user.clear(orgInput);
    await user.type(orgInput, 'custom-org');

    // Reset
    await user.click(screen.getByText('Reset'));

    expect(orgInput.value).toBe('demo');
  });

  it('shows empty state when no results', async () => {
    render(<ApiQueryTesterPlayground />);

    expect(screen.getByText(/Enter your organization and auth token/)).toBeInTheDocument();
    expect(screen.getByText(/demo.sentry.io/)).toBeInTheDocument();
  });

  it('handles rate limiting response', async () => {
    mockedApiClient.testSentryQuery.mockResolvedValue({
      success: false,
      error: 'Rate limit exceeded',
      statusCode: 429,
      rateLimited: true,
      rateLimit: { limit: 100, remaining: 0 },
      generatedUrl: 'https://sentry.io/...',
      generatedCurl: 'curl ...',
    });

    const user = userEvent.setup();
    render(<ApiQueryTesterPlayground />);

    const tokenInput = screen.getByPlaceholderText('sntrys_...');
    await user.type(tokenInput, 'test-token');

    await user.click(screen.getByText('Execute Query'));

    await waitFor(() => {
      expect(screen.getByText(/Rate limited/)).toBeInTheDocument();
    });
  });

  it('shows pagination info when available', async () => {
    mockedApiClient.testSentryQuery.mockResolvedValue({
      success: true,
      data: [{ id: '1' }],
      count: 1,
      pagination: {
        hasNext: true,
        hasPrevious: false,
        nextCursor: '0:100:0',
      },
      generatedUrl: 'https://sentry.io/...',
      generatedCurl: 'curl ...',
    });

    const user = userEvent.setup();
    render(<ApiQueryTesterPlayground />);

    const tokenInput = screen.getByPlaceholderText('sntrys_...');
    await user.type(tokenInput, 'test-token');

    await user.click(screen.getByText('Execute Query'));

    await waitFor(() => {
      expect(screen.getByText(/More results available/)).toBeInTheDocument();
    });
  });
});
