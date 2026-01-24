import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OutputViewer from './OutputViewer';
import { TransformResponse } from '../api/client';

describe('OutputViewer', () => {
  it('shows placeholder when no result', () => {
    render(<OutputViewer result={null} error={null} />);
    expect(screen.getByText(/No result yet/i)).toBeInTheDocument();
  });

  it('displays error message when error exists', () => {
    render(<OutputViewer result={null} error="Test error message" />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('shows transformation failed for unsuccessful result', () => {
    const result: TransformResponse = {
      success: false,
      error: 'Transformation failed',
    };

    render(<OutputViewer result={result} error={null} />);

    expect(screen.getByText('Transformation Failed')).toBeInTheDocument();
    expect(screen.getByText('Transformation failed')).toBeInTheDocument();
  });

  it('displays traceback when available', () => {
    const result: TransformResponse = {
      success: false,
      error: 'Runtime error',
      traceback: 'Line 1: Error\nLine 2: Stack trace',
    };

    render(<OutputViewer result={result} error={null} />);

    expect(screen.getByText('Show Traceback')).toBeInTheDocument();
    expect(screen.getByText(/Line 1: Error/)).toBeInTheDocument();
  });

  it('shows success message for successful transformation', () => {
    const result: TransformResponse = {
      success: true,
      transformedEvent: {
        event_id: 'test',
        exception: { values: [{ type: 'Error', value: 'Modified' }] },
      },
    };

    render(<OutputViewer result={result} error={null} />);

    expect(screen.getByText(/Transformation Successful/i)).toBeInTheDocument();
    expect(screen.getByText('Transformed Event')).toBeInTheDocument();
  });

  it('displays transformed event JSON', () => {
    const transformedEvent = {
      event_id: 'test-123',
      exception: { values: [{ type: 'Error', value: 'Test error' }] },
    };

    const result: TransformResponse = {
      success: true,
      transformedEvent,
    };

    render(<OutputViewer result={result} error={null} />);

    const jsonText = screen.getByText(/"event_id": "test-123"/);
    expect(jsonText).toBeInTheDocument();
  });

  it('shows event dropped message when transformedEvent is null', () => {
    const result: TransformResponse = {
      success: true,
      transformedEvent: null,
    };

    render(<OutputViewer result={result} error={null} />);

    expect(screen.getByText('Event Dropped')).toBeInTheDocument();
    expect(screen.getByText(/returned null\/None/i)).toBeInTheDocument();
  });

  it('prefers error prop over result.error', () => {
    const result: TransformResponse = {
      success: false,
      error: 'Result error',
    };

    render(<OutputViewer result={result} error="Prop error" />);

    expect(screen.getByText('Prop error')).toBeInTheDocument();
    expect(screen.queryByText('Result error')).not.toBeInTheDocument();
  });

  describe('Tab Functionality', () => {
    it('shows Full Output tab by default', () => {
      const result: TransformResponse = {
        success: true,
        originalEvent: { event_id: 'original-123' },
        transformedEvent: { event_id: 'transformed-123' },
      };

      render(<OutputViewer result={result} error={null} />);

      expect(screen.getByRole('tab', { name: /Full Output/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Diff View/i })).toBeInTheDocument();
    });

    it('Full Output tab is active by default', () => {
      const result: TransformResponse = {
        success: true,
        originalEvent: { event_id: 'original-123' },
        transformedEvent: { event_id: 'transformed-123' },
      };

      render(<OutputViewer result={result} error={null} />);

      const fullOutputTab = screen.getByRole('tab', { name: /Full Output/i });
      expect(fullOutputTab).toHaveAttribute('aria-selected', 'true');
    });

    it('switches to Diff View when tab is clicked', async () => {
      const user = userEvent.setup();
      const result: TransformResponse = {
        success: true,
        originalEvent: { event_id: 'original-123', message: 'Original' },
        transformedEvent: { event_id: 'original-123', message: 'Modified' },
      };

      render(<OutputViewer result={result} error={null} />);

      const diffViewTab = screen.getByRole('tab', { name: /Diff View/i });
      await user.click(diffViewTab);

      expect(diffViewTab).toHaveAttribute('aria-selected', 'true');
    });

    it('does not show tabs when transformedEvent is null', () => {
      const result: TransformResponse = {
        success: true,
        transformedEvent: null,
      };

      render(<OutputViewer result={result} error={null} />);

      expect(screen.queryByRole('tab', { name: /Full Output/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: /Diff View/i })).not.toBeInTheDocument();
    });

    it('does not show tabs when originalEvent is missing', () => {
      const result: TransformResponse = {
        success: true,
        transformedEvent: { event_id: 'test-123' },
      };

      render(<OutputViewer result={result} error={null} />);

      // Should not show tabs, just the transformed output
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    it('shows diff content in Diff View tab', async () => {
      const user = userEvent.setup();
      const result: TransformResponse = {
        success: true,
        originalEvent: { event_id: '123', message: 'Original message' },
        transformedEvent: { event_id: '123', message: 'Transformed message' },
      };

      render(<OutputViewer result={result} error={null} />);

      const diffViewTab = screen.getByRole('tab', { name: /Diff View/i });
      await user.click(diffViewTab);

      // Should show diff viewer with titles
      expect(screen.getByText('Original Event')).toBeInTheDocument();
      expect(screen.getByText('Transformed Event')).toBeInTheDocument();
    });
  });
});
