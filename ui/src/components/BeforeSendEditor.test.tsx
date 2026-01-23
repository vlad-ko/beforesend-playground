import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BeforeSendEditor from './BeforeSendEditor';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, language }: any) => (
    <textarea
      data-testid="monaco-editor"
      data-language={language}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe('BeforeSendEditor', () => {
  it('renders Monaco editor', () => {
    const mockOnChange = vi.fn();
    render(
      <BeforeSendEditor value="" onChange={mockOnChange} language="javascript" />
    );

    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('displays provided value', () => {
    const mockOnChange = vi.fn();
    const code = '(event, hint) => event';

    render(
      <BeforeSendEditor value={code} onChange={mockOnChange} language="javascript" />
    );

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe(code);
  });

  it('uses javascript language', () => {
    const mockOnChange = vi.fn();
    render(
      <BeforeSendEditor value="" onChange={mockOnChange} language="javascript" />
    );

    const editor = screen.getByTestId('monaco-editor');
    expect(editor.getAttribute('data-language')).toBe('javascript');
  });

  it('uses python language', () => {
    const mockOnChange = vi.fn();
    render(
      <BeforeSendEditor value="" onChange={mockOnChange} language="python" />
    );

    const editor = screen.getByTestId('monaco-editor');
    expect(editor.getAttribute('data-language')).toBe('python');
  });

  it('calls onChange when value changes', () => {
    const mockOnChange = vi.fn();
    render(
      <BeforeSendEditor value="" onChange={mockOnChange} language="javascript" />
    );

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: 'new code' } });

    expect(mockOnChange).toHaveBeenCalledWith('new code');
  });

  it('handles JavaScript code', () => {
    const mockOnChange = vi.fn();
    const jsCode = `(event, hint) => {
  return event;
}`;

    render(
      <BeforeSendEditor value={jsCode} onChange={mockOnChange} language="javascript" />
    );

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe(jsCode);
  });

  it('handles Python code', () => {
    const mockOnChange = vi.fn();
    const pyCode = `def before_send(event, hint):
    return event`;

    render(
      <BeforeSendEditor value={pyCode} onChange={mockOnChange} language="python" />
    );

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe(pyCode);
  });

  it('uses ruby language', () => {
    const mockOnChange = vi.fn();
    render(
      <BeforeSendEditor value="" onChange={mockOnChange} language="ruby" />
    );

    const editor = screen.getByTestId('monaco-editor');
    expect(editor.getAttribute('data-language')).toBe('ruby');
  });

  it('handles Ruby code', () => {
    const mockOnChange = vi.fn();
    const rubyCode = `lambda do |event, hint|
  event
end`;

    render(
      <BeforeSendEditor value={rubyCode} onChange={mockOnChange} language="ruby" />
    );

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe(rubyCode);
  });
});
