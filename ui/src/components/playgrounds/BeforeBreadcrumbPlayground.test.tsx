import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BeforeBreadcrumbPlayground from './BeforeBreadcrumbPlayground';
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

describe('BeforeBreadcrumbPlayground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiClient.getExamples.mockResolvedValue({ examples: [] });
  });

  it('renders breadcrumb input and editor', () => {
    render(<BeforeBreadcrumbPlayground />);

    expect(screen.getByText('Breadcrumb JSON')).toBeInTheDocument();
    expect(screen.getByText('beforeBreadcrumb Code')).toBeInTheDocument();
    expect(screen.getByText('Transform')).toBeInTheDocument();
  });

  it('renders SDK selector', () => {
    render(<BeforeBreadcrumbPlayground />);

    const sdkSelector = screen.getByRole('combobox');
    expect(sdkSelector).toBeInTheDocument();
  });

  it('transforms breadcrumb successfully', async () => {
    mockedApiClient.transform.mockResolvedValue({
      success: true,
      originalEvent: { type: 'default', category: 'console', message: 'test' },
      transformedEvent: { type: 'default', category: 'console', message: 'modified' },
    });

    const user = userEvent.setup();
    render(<BeforeBreadcrumbPlayground />);

    const transformButton = screen.getByText('Transform');
    await user.click(transformButton);

    await waitFor(() => {
      expect(mockedApiClient.transform).toHaveBeenCalled();
    });
  });

  it('handles dropped breadcrumb (null return)', async () => {
    mockedApiClient.transform.mockResolvedValue({
      success: true,
      originalEvent: { type: 'default', category: 'console', message: 'test' },
      transformedEvent: null,
    });

    const user = userEvent.setup();
    render(<BeforeBreadcrumbPlayground />);

    const transformButton = screen.getByText('Transform');
    await user.click(transformButton);

    await waitFor(() => {
      expect(mockedApiClient.transform).toHaveBeenCalled();
    });
  });

  it('changes SDK and updates default code', async () => {
    const user = userEvent.setup();
    render(<BeforeBreadcrumbPlayground />);

    const sdkSelector = screen.getByRole('combobox');
    await user.selectOptions(sdkSelector, 'python');

    expect(sdkSelector).toHaveValue('python');
  });

  it('shows empty state when no result', () => {
    render(<BeforeBreadcrumbPlayground />);

    expect(screen.getByText(/No result yet/)).toBeInTheDocument();
  });

  it('handles transform errors gracefully', async () => {
    mockedApiClient.transform.mockRejectedValue({
      response: { data: { error: 'Transformation failed' } },
    });

    const user = userEvent.setup();
    render(<BeforeBreadcrumbPlayground />);

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
    render(<BeforeBreadcrumbPlayground />);

    const shareButton = screen.getByText('Share');
    await user.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText('Configuration Shared!')).toBeInTheDocument();
    });
  });

  it('has reset button', () => {
    render(<BeforeBreadcrumbPlayground />);

    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('loads default breadcrumb JSON', () => {
    render(<BeforeBreadcrumbPlayground />);

    // The component should load with a default breadcrumb
    // We check that the breadcrumb JSON section is present
    expect(screen.getByText('Breadcrumb JSON')).toBeInTheDocument();
  });
});
