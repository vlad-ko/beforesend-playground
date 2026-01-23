import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { apiClient } from './api/client';

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

// Mock API client
vi.mock('./api/client', () => ({
  apiClient: {
    transform: vi.fn(),
    getSDKs: vi.fn(),
  },
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the application header', () => {
    render(<App />);
    expect(screen.getByText('beforeSend Testing Playground')).toBeInTheDocument();
  });

  it('renders all main sections', () => {
    render(<App />);

    expect(screen.getByText('Event JSON')).toBeInTheDocument();
    expect(screen.getByText('beforeSend Code')).toBeInTheDocument();
    expect(screen.getByText('SDK:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Transform/i })).toBeInTheDocument();
  });

  it('has default event JSON', () => {
    render(<App />);
    const editors = screen.getAllByTestId('monaco-editor');
    const eventEditor = editors[0] as HTMLTextAreaElement;

    expect(eventEditor.value).toContain('event_id');
    expect(eventEditor.value).toContain('exception');
  });

  it('has default JavaScript beforeSend code', () => {
    render(<App />);
    const editors = screen.getAllByTestId('monaco-editor');
    const codeEditor = editors[1] as HTMLTextAreaElement;

    expect(codeEditor.value).toContain('(event, hint)');
    expect(codeEditor.value).toContain('return event');
  });

  it('has Transformers theme in default JavaScript beforeSend', () => {
    render(<App />);
    const editors = screen.getAllByTestId('monaco-editor');
    const codeEditor = editors[1] as HTMLTextAreaElement;

    expect(codeEditor.value).toContain('Transformers by Sentry 🤖');
    expect(codeEditor.value).toContain('TransformerError');
    expect(codeEditor.value).toContain('transformed: true');
  });

  it('changes beforeSend code when SDK changes', async () => {
    const user = userEvent.setup();
    render(<App />);

    const sdkSelect = screen.getByRole('combobox');
    await user.selectOptions(sdkSelect, 'python');

    const editors = screen.getAllByTestId('monaco-editor');
    const codeEditor = editors[1] as HTMLTextAreaElement;

    expect(codeEditor.value).toContain('def before_send');
    expect(codeEditor.value).toContain('return event');
  });

  it('has Transformers theme in default Python beforeSend', async () => {
    const user = userEvent.setup();
    render(<App />);

    const sdkSelect = screen.getByRole('combobox');
    await user.selectOptions(sdkSelect, 'python');

    const editors = screen.getAllByTestId('monaco-editor');
    const codeEditor = editors[1] as HTMLTextAreaElement;

    expect(codeEditor.value).toContain('Transformers by Sentry 🤖');
    expect(codeEditor.value).toContain('TransformerError');
    expect(codeEditor.value).toContain("['transformed'] = True");
  });

  it('shows loading state during transformation', async () => {
    const user = userEvent.setup();

    vi.mocked(apiClient.transform).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: true,
                transformedEvent: { event_id: 'test' },
              }),
            100
          )
        )
    );

    render(<App />);

    const transformButton = screen.getByRole('button', { name: /Transform/i });
    await user.click(transformButton);

    expect(screen.getByRole('button', { name: /Transforming/i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Transform/i })).toBeEnabled();
    });
  });

  it('calls API with correct parameters on transform', async () => {
    const user = userEvent.setup();

    vi.mocked(apiClient.transform).mockResolvedValue({
      success: true,
      transformedEvent: { event_id: 'result' },
    });

    render(<App />);

    const transformButton = screen.getByRole('button', { name: /Transform/i });
    await user.click(transformButton);

    await waitFor(() => {
      expect(apiClient.transform).toHaveBeenCalledWith(
        expect.objectContaining({
          sdk: 'javascript',
          event: expect.any(Object),
          beforeSendCode: expect.any(String),
        })
      );
    });
  });

  it('displays successful transformation result', async () => {
    const user = userEvent.setup();

    vi.mocked(apiClient.transform).mockResolvedValue({
      success: true,
      transformedEvent: {
        event_id: 'test-result',
        modified: true,
      },
    });

    render(<App />);

    const transformButton = screen.getByRole('button', { name: /Transform/i });
    await user.click(transformButton);

    await waitFor(() => {
      expect(screen.getByText(/Transformation Successful/i)).toBeInTheDocument();
      expect(screen.getByText(/"event_id": "test-result"/)).toBeInTheDocument();
    });
  });

  it('displays error for invalid JSON', async () => {
    const user = userEvent.setup();
    render(<App />);

    const editors = screen.getAllByTestId('monaco-editor');
    const eventEditor = editors[0] as HTMLTextAreaElement;

    // Set invalid JSON
    fireEvent.change(eventEditor, { target: { value: '{invalid json}' } });

    const transformButton = screen.getByRole('button', { name: /Transform/i });
    await user.click(transformButton);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Invalid JSON in event input')).toBeInTheDocument();
    });
  });

  it('displays API error message', async () => {
    const user = userEvent.setup();

    vi.mocked(apiClient.transform).mockRejectedValue({
      response: {
        data: {
          error: 'API transformation failed',
        },
      },
    });

    render(<App />);

    const transformButton = screen.getByRole('button', { name: /Transform/i });
    await user.click(transformButton);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('API transformation failed')).toBeInTheDocument();
    });
  });

  it('displays dropped event message when transformedEvent is null', async () => {
    const user = userEvent.setup();

    vi.mocked(apiClient.transform).mockResolvedValue({
      success: true,
      transformedEvent: null,
    });

    render(<App />);

    const transformButton = screen.getByRole('button', { name: /Transform/i });
    await user.click(transformButton);

    await waitFor(() => {
      expect(screen.getByText('Event Dropped')).toBeInTheDocument();
    });
  });

  it('clears previous result when transforming again', async () => {
    const user = userEvent.setup();

    // First transformation
    vi.mocked(apiClient.transform).mockResolvedValueOnce({
      success: true,
      transformedEvent: { event_id: 'first' },
    });

    render(<App />);

    const transformButton = screen.getByRole('button', { name: /Transform/i });
    await user.click(transformButton);

    await waitFor(() => {
      expect(screen.getByText(/"event_id": "first"/)).toBeInTheDocument();
    });

    // Second transformation
    vi.mocked(apiClient.transform).mockResolvedValueOnce({
      success: true,
      transformedEvent: { event_id: 'second' },
    });

    await user.click(transformButton);

    await waitFor(() => {
      expect(screen.getByText(/"event_id": "second"/)).toBeInTheDocument();
      expect(screen.queryByText(/"event_id": "first"/)).not.toBeInTheDocument();
    });
  });

  describe('UI Enhancements', () => {
    it('displays helper text for Event JSON section', () => {
      render(<App />);
      expect(screen.getByText(/Paste your Sentry event JSON/i)).toBeInTheDocument();
    });

    it('displays helper text for beforeSend Code section', () => {
      render(<App />);
      expect(screen.getByText(/Write your beforeSend callback/i)).toBeInTheDocument();
    });

    it('displays helper text for Result section', () => {
      render(<App />);
      expect(screen.getByText(/Click Transform to see the result/i)).toBeInTheDocument();
    });

    it('displays Sentry logo in header with visible background', () => {
      render(<App />);
      const logo = screen.getByAltText('Sentry Logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src');
      // Logo should be visible on light background
      const header = logo.closest('header');
      expect(header).toHaveClass('bg-white');
    });

    it('displays GitHub link in header', () => {
      render(<App />);
      const githubLink = screen.getByRole('link', { name: /GitHub/i });
      expect(githubLink).toBeInTheDocument();
      expect(githubLink).toHaveAttribute('href', 'https://github.com/vlad-ko/beforesend-playground');
    });

    it('SDK selector shows version for JavaScript', () => {
      render(<App />);
      const select = screen.getByRole('combobox');
      expect(select.textContent).toContain('JavaScript');
      expect(select.textContent).toContain('@sentry/node 8.55.0');
    });

    it('SDK selector shows version for Python', () => {
      render(<App />);
      const select = screen.getByRole('combobox');
      expect(select.textContent).toContain('Python');
      expect(select.textContent).toContain('sentry-sdk 2.20.0');
    });
  });
});
