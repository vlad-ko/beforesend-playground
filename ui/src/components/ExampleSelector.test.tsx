import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExampleSelector from './ExampleSelector';
import * as apiClient from '../api/client';

// Mock API client
vi.mock('../api/client', () => ({
  apiClient: {
    getExamples: vi.fn(),
  },
}));

const mockExamples = [
  {
    id: 'unity-cleanup',
    name: 'Unity Metadata Cleanup',
    description: 'Extract actual exception from Unity crash metadata',
    sdk: 'javascript',
    event: { event_id: 'test-123' },
    beforeSendCode: 'code1',
  },
  {
    id: 'pii-scrubbing',
    name: 'PII Scrubbing',
    description: 'Remove sensitive information',
    sdk: 'javascript',
    event: { event_id: 'test-456' },
    beforeSendCode: 'code2',
  },
];

describe('ExampleSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and displays examples on mount', async () => {
    (apiClient.apiClient.getExamples as any).mockResolvedValue({ examples: mockExamples });

    const mockOnSelect = vi.fn();
    render(<ExampleSelector onSelect={mockOnSelect} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Load Example')).toBeInTheDocument();
    });

    // Open dropdown
    const selectButton = screen.getByRole('button');
    fireEvent.click(selectButton);

    // Examples should now be visible
    await waitFor(() => {
      expect(screen.getByText('Unity Metadata Cleanup')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching', () => {
    (apiClient.apiClient.getExamples as any).mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({ examples: [] }), 100))
    );

    const mockOnSelect = vi.fn();
    render(<ExampleSelector onSelect={mockOnSelect} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    (apiClient.apiClient.getExamples as any).mockRejectedValue(new Error('API Error'));

    const mockOnSelect = vi.fn();
    render(<ExampleSelector onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('calls onSelect with example data when example is selected', async () => {
    (apiClient.apiClient.getExamples as any).mockResolvedValue({ examples: mockExamples });

    const mockOnSelect = vi.fn();
    render(<ExampleSelector onSelect={mockOnSelect} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Load Example')).toBeInTheDocument();
    });

    // Open dropdown
    const selectButton = screen.getByRole('button');
    fireEvent.click(selectButton);

    // Wait for examples to be visible and click one
    await waitFor(() => {
      const option = screen.getByText('Unity Metadata Cleanup');
      fireEvent.click(option);
    });

    expect(mockOnSelect).toHaveBeenCalledWith(mockExamples[0]);
  });

  it('displays example description in dropdown', async () => {
    (apiClient.apiClient.getExamples as any).mockResolvedValue({ examples: mockExamples });

    const mockOnSelect = vi.fn();
    render(<ExampleSelector onSelect={mockOnSelect} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Load Example')).toBeInTheDocument();
    });

    // Open dropdown
    const selectButton = screen.getByRole('button');
    fireEvent.click(selectButton);

    // Description should now be visible
    await waitFor(() => {
      expect(screen.getByText(/Extract actual exception/)).toBeInTheDocument();
    });
  });

  it('handles empty examples list', async () => {
    (apiClient.apiClient.getExamples as any).mockResolvedValue({ examples: [] });

    const mockOnSelect = vi.fn();
    render(<ExampleSelector onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText(/no examples/i)).toBeInTheDocument();
    });
  });

  it('displays selected example name in button after selection', async () => {
    (apiClient.apiClient.getExamples as any).mockResolvedValue({ examples: mockExamples });

    const mockOnSelect = vi.fn();
    render(<ExampleSelector onSelect={mockOnSelect} />);

    // Initially shows "Load Example"
    await waitFor(() => {
      expect(screen.getByText('Load Example')).toBeInTheDocument();
    });

    // Open dropdown
    const selectButton = screen.getByRole('button');
    fireEvent.click(selectButton);

    // Select an example
    await waitFor(() => {
      const option = screen.getByText('Unity Metadata Cleanup');
      fireEvent.click(option);
    });

    // Button should now show the selected example name
    await waitFor(() => {
      expect(screen.getByText('Unity Metadata Cleanup')).toBeInTheDocument();
    });

    // "Load Example" should no longer be visible
    expect(screen.queryByText('Load Example')).not.toBeInTheDocument();
  });
});
