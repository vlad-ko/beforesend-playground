import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FingerprintingPlayground from './FingerprintingPlayground';
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

describe('FingerprintingPlayground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiClient.getExamples.mockResolvedValue({ examples: [] });
  });

  it('renders event input and code editor', () => {
    render(<FingerprintingPlayground />);

    expect(screen.getByText('Event JSON')).toBeInTheDocument();
    expect(screen.getByText('Fingerprinting Code')).toBeInTheDocument();
    expect(screen.getByText('Transform')).toBeInTheDocument();
  });

  it('shows convenience mode explanation banner', () => {
    render(<FingerprintingPlayground />);

    expect(screen.getByText(/convenience mode/i)).toBeInTheDocument();
    expect(screen.getByText(/beforeSend/i)).toBeInTheDocument();
  });

  it('renders SDK selector', () => {
    render(<FingerprintingPlayground />);

    const sdkSelector = screen.getByRole('combobox');
    expect(sdkSelector).toBeInTheDocument();
  });

  it('transforms event and shows fingerprint comparison', async () => {
    mockedApiClient.transform.mockResolvedValue({
      success: true,
      originalEvent: {
        event_id: 'abc123',
        message: 'Database error',
      },
      transformedEvent: {
        event_id: 'abc123',
        message: 'Database error',
        fingerprint: ['database-error'],
      },
    });

    const user = userEvent.setup();
    render(<FingerprintingPlayground />);

    const transformButton = screen.getByText('Transform');
    await user.click(transformButton);

    await waitFor(() => {
      expect(mockedApiClient.transform).toHaveBeenCalled();
    });
  });

  it('shows default fingerprint explanation when no custom fingerprint set', async () => {
    mockedApiClient.transform.mockResolvedValue({
      success: true,
      originalEvent: { event_id: 'abc123' },
      transformedEvent: { event_id: 'abc123' }, // No fingerprint set
    });

    const user = userEvent.setup();
    render(<FingerprintingPlayground />);

    const transformButton = screen.getByText('Transform');
    await user.click(transformButton);

    await waitFor(() => {
      // Should show that no custom fingerprint was set
      expect(screen.getByText('No Custom Fingerprint Set')).toBeInTheDocument();
    });
  });

  it('shows custom fingerprint when set', async () => {
    mockedApiClient.transform.mockResolvedValue({
      success: true,
      originalEvent: { event_id: 'abc123' },
      transformedEvent: {
        event_id: 'abc123',
        fingerprint: ['custom-group'],
      },
    });

    const user = userEvent.setup();
    render(<FingerprintingPlayground />);

    const transformButton = screen.getByText('Transform');
    await user.click(transformButton);

    await waitFor(() => {
      // The fingerprint is shown as JSON array in the UI
      expect(screen.getByText('Custom Fingerprint')).toBeInTheDocument();
    });
  });

  it('handles transformation errors gracefully', async () => {
    mockedApiClient.transform.mockRejectedValue({
      response: { data: { error: 'Transformation failed' } },
    });

    const user = userEvent.setup();
    render(<FingerprintingPlayground />);

    const transformButton = screen.getByText('Transform');
    await user.click(transformButton);

    await waitFor(() => {
      expect(screen.getByText(/Transformation failed/)).toBeInTheDocument();
    });
  });

  it('shows event dropped message when transformedEvent is null', async () => {
    mockedApiClient.transform.mockResolvedValue({
      success: true,
      originalEvent: { event_id: 'abc123' },
      transformedEvent: null, // Event dropped
    });

    const user = userEvent.setup();
    render(<FingerprintingPlayground />);

    const transformButton = screen.getByText('Transform');
    await user.click(transformButton);

    await waitFor(() => {
      expect(screen.getByText('Event Dropped')).toBeInTheDocument();
    });
  });

  it('changes SDK and updates default code', async () => {
    const user = userEvent.setup();
    render(<FingerprintingPlayground />);

    const sdkSelector = screen.getByRole('combobox');
    await user.selectOptions(sdkSelector, 'python');

    expect(sdkSelector).toHaveValue('python');
  });
});
