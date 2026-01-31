import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TracesSamplerPlayground from './TracesSamplerPlayground';
import { apiClient } from '../../api/client';

// Mock the API client
vi.mock('../../api/client', () => ({
  apiClient: {
    transform: vi.fn(),
    createAnonymousGist: vi.fn(),
    getExamples: vi.fn().mockResolvedValue({ examples: [] }),
  },
}));

const mockedApiClient = vi.mocked(apiClient);

describe('TracesSamplerPlayground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiClient.getExamples.mockResolvedValue({ examples: [] });
  });

  it('renders sampling context input and editor', () => {
    render(<TracesSamplerPlayground />);

    expect(screen.getByText('Test Transaction')).toBeInTheDocument();
    expect(screen.getByText('tracesSampler Code')).toBeInTheDocument();
    expect(screen.getByText('Evaluate')).toBeInTheDocument();
  });

  it('renders SDK selector', () => {
    render(<TracesSamplerPlayground />);

    const sdkSelector = screen.getByRole('combobox');
    expect(sdkSelector).toBeInTheDocument();
  });

  it('evaluates sampler and returns sampling decision', async () => {
    mockedApiClient.transform.mockResolvedValue({
      success: true,
      originalEvent: { transactionContext: { name: 'GET /api/payment' } },
      transformedEvent: 1.0, // Full sampling rate
    });

    const user = userEvent.setup();
    render(<TracesSamplerPlayground />);

    const evaluateButton = screen.getByText('Evaluate');
    await user.click(evaluateButton);

    await waitFor(() => {
      expect(mockedApiClient.transform).toHaveBeenCalled();
    });
  });

  it('displays sampling rate as percentage', async () => {
    mockedApiClient.transform.mockResolvedValue({
      success: true,
      originalEvent: { transactionContext: { name: 'GET /health' } },
      transformedEvent: 0.1, // 10% sampling
    });

    const user = userEvent.setup();
    render(<TracesSamplerPlayground />);

    const evaluateButton = screen.getByText('Evaluate');
    await user.click(evaluateButton);

    await waitFor(() => {
      // Check for the main percentage display (the bold number)
      expect(screen.getByText('10%')).toBeInTheDocument();
    });
  });

  it('handles zero sampling rate (dropped)', async () => {
    mockedApiClient.transform.mockResolvedValue({
      success: true,
      originalEvent: { transactionContext: { name: 'GET /health' } },
      transformedEvent: 0.0, // No sampling
    });

    const user = userEvent.setup();
    render(<TracesSamplerPlayground />);

    const evaluateButton = screen.getByText('Evaluate');
    await user.click(evaluateButton);

    await waitFor(() => {
      // Check for the message about no transactions being sent
      expect(screen.getByText(/No transactions will be sent/)).toBeInTheDocument();
    });
  });

  it('handles full sampling rate (100%)', async () => {
    mockedApiClient.transform.mockResolvedValue({
      success: true,
      originalEvent: { transactionContext: { name: 'POST /api/checkout' } },
      transformedEvent: 1.0, // Full sampling
    });

    const user = userEvent.setup();
    render(<TracesSamplerPlayground />);

    const evaluateButton = screen.getByText('Evaluate');
    await user.click(evaluateButton);

    await waitFor(() => {
      // Check for the message about all transactions being sent
      expect(screen.getByText(/All transactions will be sent/)).toBeInTheDocument();
    });
  });

  it('changes SDK and updates default code', async () => {
    const user = userEvent.setup();
    render(<TracesSamplerPlayground />);

    const sdkSelector = screen.getByRole('combobox');
    await user.selectOptions(sdkSelector, 'python');

    expect(sdkSelector).toHaveValue('python');
  });

  it('shows empty state when no result', () => {
    render(<TracesSamplerPlayground />);

    expect(screen.getByText(/No result yet/)).toBeInTheDocument();
  });

  it('handles evaluation errors gracefully', async () => {
    mockedApiClient.transform.mockRejectedValue({
      response: { data: { error: 'Evaluation failed' } },
    });

    const user = userEvent.setup();
    render(<TracesSamplerPlayground />);

    const evaluateButton = screen.getByText('Evaluate');
    await user.click(evaluateButton);

    await waitFor(() => {
      expect(screen.getByText(/Evaluation failed/)).toBeInTheDocument();
    });
  });

  it('can share configuration', async () => {
    mockedApiClient.createAnonymousGist.mockResolvedValue({
      html_url: 'https://paste.example.com/abc123',
      id: 'abc123',
    });

    const user = userEvent.setup();
    render(<TracesSamplerPlayground />);

    const shareButton = screen.getByText('Share');
    await user.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText('Configuration Shared!')).toBeInTheDocument();
    });
  });

  it('displays visual indicator for sampling decision', async () => {
    mockedApiClient.transform.mockResolvedValue({
      success: true,
      originalEvent: { transactionContext: { name: 'GET /api/users' } },
      transformedEvent: 0.25, // 25% sampling
    });

    const user = userEvent.setup();
    render(<TracesSamplerPlayground />);

    const evaluateButton = screen.getByText('Evaluate');
    await user.click(evaluateButton);

    await waitFor(() => {
      // Should show that 75% will be dropped (displayed as "X% sampled (75% dropped)")
      expect(screen.getByText(/25% sampled.*75% dropped/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // SDK-specific sampling context tests
  // ============================================

  describe('SDK-specific sampling context', () => {
    it('sends camelCase JSON keys for JavaScript SDK', async () => {
      mockedApiClient.transform.mockResolvedValue({
        success: true,
        originalEvent: {},
        transformedEvent: 0.1,
      });

      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      // JavaScript is the default SDK
      const evaluateButton = screen.getByText('Evaluate');
      await user.click(evaluateButton);

      await waitFor(() => {
        expect(mockedApiClient.transform).toHaveBeenCalled();
        const callArg = mockedApiClient.transform.mock.calls[0][0];
        // Should use camelCase keys
        expect(callArg.event).toHaveProperty('transactionContext');
        expect(callArg.event.transactionContext).toHaveProperty('name');
        expect(callArg.event).toHaveProperty('parentSampled');
      });
    });

    it('sends snake_case JSON keys for Python SDK', async () => {
      mockedApiClient.transform.mockResolvedValue({
        success: true,
        originalEvent: {},
        transformedEvent: 0.1,
      });

      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'python');

      const evaluateButton = screen.getByText('Evaluate');
      await user.click(evaluateButton);

      await waitFor(() => {
        expect(mockedApiClient.transform).toHaveBeenCalled();
        const callArg = mockedApiClient.transform.mock.calls[0][0];
        // Should use snake_case keys
        expect(callArg.event).toHaveProperty('transaction_context');
        expect(callArg.event.transaction_context).toHaveProperty('name');
        expect(callArg.event).toHaveProperty('parent_sampled');
      });
    });

    it('sends snake_case JSON keys for Ruby SDK', async () => {
      mockedApiClient.transform.mockResolvedValue({
        success: true,
        originalEvent: {},
        transformedEvent: 0.1,
      });

      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'ruby');

      const evaluateButton = screen.getByText('Evaluate');
      await user.click(evaluateButton);

      await waitFor(() => {
        expect(mockedApiClient.transform).toHaveBeenCalled();
        const callArg = mockedApiClient.transform.mock.calls[0][0];
        // Ruby uses snake_case
        expect(callArg.event).toHaveProperty('transaction_context');
      });
    });

    it('sends snake_case JSON keys for PHP SDK', async () => {
      mockedApiClient.transform.mockResolvedValue({
        success: true,
        originalEvent: {},
        transformedEvent: 0.1,
      });

      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'php');

      const evaluateButton = screen.getByText('Evaluate');
      await user.click(evaluateButton);

      await waitFor(() => {
        expect(mockedApiClient.transform).toHaveBeenCalled();
        const callArg = mockedApiClient.transform.mock.calls[0][0];
        // PHP uses snake_case
        expect(callArg.event).toHaveProperty('transaction_context');
      });
    });

    // Note: Rust SDK doesn't support tracesSampler execution - tested in 'SDK execution support indicator' section

    it('sends snake_case JSON keys for Elixir SDK', async () => {
      mockedApiClient.transform.mockResolvedValue({
        success: true,
        originalEvent: {},
        transformedEvent: 0.1,
      });

      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'elixir');

      const evaluateButton = screen.getByText('Evaluate');
      await user.click(evaluateButton);

      await waitFor(() => {
        expect(mockedApiClient.transform).toHaveBeenCalled();
        const callArg = mockedApiClient.transform.mock.calls[0][0];
        // Elixir uses snake_case
        expect(callArg.event).toHaveProperty('transaction_context');
      });
    });

    // Note: Go, .NET, Java, Android, Cocoa SDKs don't support tracesSampler execution
    // They are tested in 'SDK execution support indicator' section for disabled state

    it('sends camelCase JSON keys for React Native SDK', async () => {
      mockedApiClient.transform.mockResolvedValue({
        success: true,
        originalEvent: {},
        transformedEvent: 0.1,
      });

      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'react-native');

      const evaluateButton = screen.getByText('Evaluate');
      await user.click(evaluateButton);

      await waitFor(() => {
        expect(mockedApiClient.transform).toHaveBeenCalled();
        const callArg = mockedApiClient.transform.mock.calls[0][0];
        // React Native uses camelCase
        expect(callArg.event).toHaveProperty('transactionContext');
      });
    });
  });

  describe('Quick scenario buttons SDK awareness', () => {
    it('generates snake_case JSON for Python when clicking Checkout button', async () => {
      mockedApiClient.transform.mockResolvedValue({
        success: true,
        originalEvent: {},
        transformedEvent: 1.0,
      });

      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'python');

      // Click the "Checkout" quick scenario button
      const checkoutButton = screen.getByText('Checkout');
      await user.click(checkoutButton);

      // Now evaluate to check what JSON is sent
      const evaluateButton = screen.getByText('Evaluate');
      await user.click(evaluateButton);

      await waitFor(() => {
        expect(mockedApiClient.transform).toHaveBeenCalled();
        const callArg = mockedApiClient.transform.mock.calls[0][0];
        // Should use snake_case
        expect(callArg.event).toHaveProperty('transaction_context');
        expect(callArg.event.transaction_context.name).toBe('POST /api/checkout');
      });
    });

    it('generates camelCase JSON for JavaScript when clicking Health Check button', async () => {
      mockedApiClient.transform.mockResolvedValue({
        success: true,
        originalEvent: {},
        transformedEvent: 0.0,
      });

      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      // JavaScript is default, click Health Check
      const healthCheckButton = screen.getByText('Health Check');
      await user.click(healthCheckButton);

      const evaluateButton = screen.getByText('Evaluate');
      await user.click(evaluateButton);

      await waitFor(() => {
        expect(mockedApiClient.transform).toHaveBeenCalled();
        const callArg = mockedApiClient.transform.mock.calls[0][0];
        // Should use camelCase
        expect(callArg.event).toHaveProperty('transactionContext');
        expect(callArg.event.transactionContext.name).toBe('GET /health');
        expect(callArg.event).toHaveProperty('parentSampled');
      });
    });

    it('generates snake_case JSON for Ruby when clicking API Call button', async () => {
      mockedApiClient.transform.mockResolvedValue({
        success: true,
        originalEvent: {},
        transformedEvent: 0.1,
      });

      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'ruby');

      const apiCallButton = screen.getByText('API Call');
      await user.click(apiCallButton);

      const evaluateButton = screen.getByText('Evaluate');
      await user.click(evaluateButton);

      await waitFor(() => {
        expect(mockedApiClient.transform).toHaveBeenCalled();
        const callArg = mockedApiClient.transform.mock.calls[0][0];
        // Ruby uses snake_case
        expect(callArg.event).toHaveProperty('transaction_context');
        expect(callArg.event.transaction_context.name).toBe('GET /api/users');
      });
    });

    it('generates snake_case JSON for PHP when clicking Static Asset button', async () => {
      mockedApiClient.transform.mockResolvedValue({
        success: true,
        originalEvent: {},
        transformedEvent: 0.01,
      });

      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'php');

      const staticAssetButton = screen.getByText('Static Asset');
      await user.click(staticAssetButton);

      const evaluateButton = screen.getByText('Evaluate');
      await user.click(evaluateButton);

      await waitFor(() => {
        expect(mockedApiClient.transform).toHaveBeenCalled();
        const callArg = mockedApiClient.transform.mock.calls[0][0];
        // PHP uses snake_case
        expect(callArg.event).toHaveProperty('transaction_context');
        expect(callArg.event.transaction_context.name).toBe('GET /static/logo.png');
      });
    });
  });

  describe('SDK execution support indicator', () => {
    it('shows warning banner when non-executable SDK is selected', async () => {
      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'go');

      await waitFor(() => {
        expect(screen.getByText('Code Reference Only')).toBeInTheDocument();
        expect(screen.getByText(/doesn't support tracesSampler execution/)).toBeInTheDocument();
      });
    });

    it('does not show warning banner for JavaScript SDK', () => {
      render(<TracesSamplerPlayground />);

      // JavaScript is default and should support execution
      expect(screen.queryByText('Code Reference Only')).not.toBeInTheDocument();
    });

    it('does not show warning banner for Python SDK', async () => {
      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'python');

      await waitFor(() => {
        expect(screen.queryByText('Code Reference Only')).not.toBeInTheDocument();
      });
    });

    it('disables Evaluate button for unsupported SDKs', async () => {
      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'rust');

      await waitFor(() => {
        const evaluateButton = screen.getByRole('button', { name: 'Evaluate' });
        expect(evaluateButton).toBeDisabled();
      });
    });

    it('enables Evaluate button for supported SDKs', async () => {
      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'ruby');

      await waitFor(() => {
        const evaluateButton = screen.getByText('Evaluate');
        expect(evaluateButton).not.toBeDisabled();
      });
    });

    it('shows warning for .NET SDK', async () => {
      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'dotnet');

      await waitFor(() => {
        expect(screen.getByText('Code Reference Only')).toBeInTheDocument();
      });
    });
  });

  describe('SDK switching preserves correct JSON structure', () => {
    it('switches from JavaScript to Python and updates JSON structure', async () => {
      mockedApiClient.transform.mockResolvedValue({
        success: true,
        originalEvent: {},
        transformedEvent: 0.1,
      });

      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      // Start with JavaScript (default) and evaluate
      let evaluateButton = screen.getByText('Evaluate');
      await user.click(evaluateButton);

      await waitFor(() => {
        expect(mockedApiClient.transform).toHaveBeenCalledTimes(1);
        const callArg = mockedApiClient.transform.mock.calls[0][0];
        expect(callArg.event).toHaveProperty('transactionContext'); // camelCase
      });

      // Switch to Python
      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'python');

      // Evaluate again
      evaluateButton = screen.getByText('Evaluate');
      await user.click(evaluateButton);

      await waitFor(() => {
        expect(mockedApiClient.transform).toHaveBeenCalledTimes(2);
        const callArg = mockedApiClient.transform.mock.calls[1][0];
        expect(callArg.event).toHaveProperty('transaction_context'); // snake_case
      });
    });

    it('switches from Python to JavaScript and updates JSON structure', async () => {
      mockedApiClient.transform.mockResolvedValue({
        success: true,
        originalEvent: {},
        transformedEvent: 0.1,
      });

      const user = userEvent.setup();
      render(<TracesSamplerPlayground />);

      // Switch to Python first
      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'python');

      let evaluateButton = screen.getByText('Evaluate');
      await user.click(evaluateButton);

      await waitFor(() => {
        expect(mockedApiClient.transform).toHaveBeenCalledTimes(1);
        const callArg = mockedApiClient.transform.mock.calls[0][0];
        expect(callArg.event).toHaveProperty('transaction_context'); // snake_case
      });

      // Switch back to JavaScript
      await user.selectOptions(sdkSelector, 'javascript');

      evaluateButton = screen.getByText('Evaluate');
      await user.click(evaluateButton);

      await waitFor(() => {
        expect(mockedApiClient.transform).toHaveBeenCalledTimes(2);
        const callArg = mockedApiClient.transform.mock.calls[1][0];
        expect(callArg.event).toHaveProperty('transactionContext'); // camelCase
      });
    });
  });
});
