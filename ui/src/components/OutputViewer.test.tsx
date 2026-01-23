import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
