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
});
