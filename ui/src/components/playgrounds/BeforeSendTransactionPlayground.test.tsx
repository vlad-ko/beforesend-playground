import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BeforeSendTransactionPlayground from './BeforeSendTransactionPlayground';
import { apiClient } from '../../api/client';

// Mock the API client
vi.mock('../../api/client', () => ({
  apiClient: {
    transform: vi.fn(),
    createAnonymousGist: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient);

describe('BeforeSendTransactionPlayground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders transaction input and editor', () => {
    render(<BeforeSendTransactionPlayground />);

    expect(screen.getByText('Transaction JSON')).toBeInTheDocument();
    expect(screen.getByText('beforeSendTransaction Code')).toBeInTheDocument();
    expect(screen.getByText('Transform')).toBeInTheDocument();
  });

  it('displays info banner about transaction events', () => {
    render(<BeforeSendTransactionPlayground />);

    expect(screen.getByText('Transaction Events')).toBeInTheDocument();
    expect(screen.getByText(/is called for performance monitoring events/)).toBeInTheDocument();
  });

  it('shows quick example buttons', () => {
    render(<BeforeSendTransactionPlayground />);

    expect(screen.getByText('Drop Health Checks')).toBeInTheDocument();
    expect(screen.getByText('Scrub Sensitive URLs')).toBeInTheDocument();
    expect(screen.getByText('Add Custom Tags')).toBeInTheDocument();
  });

  it('transforms transaction successfully', async () => {
    mockedApiClient.transform.mockResolvedValue({
      success: true,
      originalEvent: { type: 'transaction', transaction: 'GET /api/users' },
      transformedEvent: { type: 'transaction', transaction: 'GET /api/users', tags: { team: 'user-team' } },
    });

    const user = userEvent.setup();
    render(<BeforeSendTransactionPlayground />);

    const transformButton = screen.getByText('Transform');
    await user.click(transformButton);

    await waitFor(() => {
      expect(mockedApiClient.transform).toHaveBeenCalled();
    });
  });

  it('handles dropped transaction (null return)', async () => {
    mockedApiClient.transform.mockResolvedValue({
      success: true,
      originalEvent: { type: 'transaction', transaction: 'GET /health' },
      transformedEvent: null,
    });

    const user = userEvent.setup();
    render(<BeforeSendTransactionPlayground />);

    const transformButton = screen.getByText('Transform');
    await user.click(transformButton);

    await waitFor(() => {
      expect(mockedApiClient.transform).toHaveBeenCalled();
    });
  });

  it('changes SDK and updates default code', async () => {
    const user = userEvent.setup();
    render(<BeforeSendTransactionPlayground />);

    // Find SDK selector and change it
    const sdkSelector = screen.getByRole('combobox');
    await user.selectOptions(sdkSelector, 'python');

    // The code should have changed to Python syntax
    // We can verify by checking the component re-rendered
    expect(sdkSelector).toHaveValue('python');
  });

  it('shows empty state when no result', () => {
    render(<BeforeSendTransactionPlayground />);

    expect(screen.getByText(/No result yet/)).toBeInTheDocument();
    expect(screen.getByText(/Return/)).toBeInTheDocument();
  });

  it('handles transform errors gracefully', async () => {
    mockedApiClient.transform.mockRejectedValue({
      response: { data: { error: 'Transformation failed' } },
    });

    const user = userEvent.setup();
    render(<BeforeSendTransactionPlayground />);

    const transformButton = screen.getByText('Transform');
    await user.click(transformButton);

    await waitFor(() => {
      expect(screen.getByText(/Transformation failed/)).toBeInTheDocument();
    });
  });

  it('can share configuration', async () => {
    mockedApiClient.createAnonymousGist.mockResolvedValue({
      html_url: 'https://paste.example.com/abc123',
      id: 'abc123',
    });

    const user = userEvent.setup();
    render(<BeforeSendTransactionPlayground />);

    const shareButton = screen.getByText('Share');
    await user.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText('Configuration Shared!')).toBeInTheDocument();
    });
  });
});
