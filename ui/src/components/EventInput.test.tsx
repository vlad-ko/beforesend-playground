import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EventInput from './EventInput';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: any) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe('EventInput', () => {
  it('renders Monaco editor', () => {
    const mockOnChange = vi.fn();
    render(<EventInput value="" onChange={mockOnChange} />);

    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('displays provided value', () => {
    const mockOnChange = vi.fn();
    const testValue = '{"event_id": "test"}';

    render(<EventInput value={testValue} onChange={mockOnChange} />);

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe(testValue);
  });

  it('calls onChange when value changes', () => {
    const mockOnChange = vi.fn();
    render(<EventInput value="" onChange={mockOnChange} />);

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: '{"test": "value"}' } });

    expect(mockOnChange).toHaveBeenCalledWith('{"test": "value"}');
  });

  it('handles empty value', () => {
    const mockOnChange = vi.fn();
    render(<EventInput value="" onChange={mockOnChange} />);

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe('');
  });

  it('handles JSON string value', () => {
    const mockOnChange = vi.fn();
    const jsonValue = JSON.stringify(
      { event_id: 'test', timestamp: '2026-01-23' },
      null,
      2
    );

    render(<EventInput value={jsonValue} onChange={mockOnChange} />);

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe(jsonValue);
  });
});
