import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WebhookPlayground from './WebhookPlayground';
import { apiClient } from '../../api/client';

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
vi.mock('../../api/client', () => ({
  apiClient: {
    getWebhookTemplates: vi.fn(),
    getWebhookTemplate: vi.fn(),
    sendWebhook: vi.fn(),
  },
}));

const mockTemplates = {
  templates: [
    {
      id: 'issue-alert-created',
      name: 'Issue Alert - Created',
      description: 'Triggered when a new issue is created',
      eventType: 'issue',
    },
    {
      id: 'metric-alert',
      name: 'Metric Alert - Triggered',
      description: 'Triggered when a metric alert threshold is exceeded',
      eventType: 'metric_alert',
    },
  ],
};

const mockTemplateDetail = {
  id: 'issue-alert-created',
  name: 'Issue Alert - Created',
  description: 'Triggered when a new issue is created',
  eventType: 'issue',
  payload: {
    action: 'created',
    data: {
      issue: {
        id: '123',
        title: 'Test Issue',
      },
    },
  },
};

describe('WebhookPlayground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.getWebhookTemplates as any).mockResolvedValue(mockTemplates);
    (apiClient.getWebhookTemplate as any).mockResolvedValue(mockTemplateDetail);
  });

  it('renders the component', () => {
    render(<WebhookPlayground />);
    expect(screen.getByText(/Webhook Playground/i)).toBeInTheDocument();
  });

  it('loads templates on mount', async () => {
    render(<WebhookPlayground />);

    await waitFor(() => {
      expect(apiClient.getWebhookTemplates).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('displays template options in dropdown', async () => {
    render(<WebhookPlayground />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const options = Array.from(select.options).map(opt => opt.textContent);

    expect(options).toContain('Issue Alert - Created');
    expect(options).toContain('Metric Alert - Triggered');
  });

  it('updates payload when template is selected', async () => {
    render(<WebhookPlayground />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'issue-alert-created' } });

    await waitFor(() => {
      expect(apiClient.getWebhookTemplate).toHaveBeenCalledWith('issue-alert-created');
    });

    await waitFor(() => {
      const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
      expect(editor.value).toContain('created');
      expect(editor.value).toContain('Test Issue');
    });
  });

  it('renders target URL input field', async () => {
    render(<WebhookPlayground />);
    await waitFor(() => {
      const urlInput = screen.getByPlaceholderText(/webhook\.site/i);
      expect(urlInput).toBeInTheDocument();
    });
  });

  it('renders webhook secret input field', async () => {
    render(<WebhookPlayground />);
    await waitFor(() => {
      const secretInput = screen.getByPlaceholderText(/your-webhook-secret/i);
      expect(secretInput).toBeInTheDocument();
    });
  });

  it('renders signature generation checkbox', () => {
    render(<WebhookPlayground />);
    const checkbox = screen.getByRole('checkbox', { name: /generate.*signature/i });
    expect(checkbox).toBeInTheDocument();
  });

  it('renders send webhook button', () => {
    render(<WebhookPlayground />);
    const button = screen.getByRole('button', { name: /send webhook/i });
    expect(button).toBeInTheDocument();
  });

  it('disables send button when URL is empty', () => {
    render(<WebhookPlayground />);
    const button = screen.getByRole('button', { name: /send webhook/i });
    expect(button).toBeDisabled();
  });

  it('enables send button when URL is provided', () => {
    render(<WebhookPlayground />);

    const urlInput = screen.getByPlaceholderText(/webhook\.site/i);
    fireEvent.change(urlInput, { target: { value: 'https://webhook.site/test' } });

    const button = screen.getByRole('button', { name: /send webhook/i });
    expect(button).toBeEnabled();
  });

  it('sends webhook when button is clicked', async () => {
    const mockResponse = {
      success: true,
      sentAt: '2026-01-29T12:00:00.000Z',
      signature: 'abc123',
      webhookStatus: 200,
      webhookStatusText: 'OK',
    };

    (apiClient.sendWebhook as any).mockResolvedValue(mockResponse);

    render(<WebhookPlayground />);

    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Select template
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'issue-alert-created' } });

    await waitFor(() => {
      expect(apiClient.getWebhookTemplate).toHaveBeenCalled();
    });

    // Fill URL
    const urlInput = screen.getByPlaceholderText(/webhook\.site/i);
    fireEvent.change(urlInput, { target: { value: 'https://webhook.site/test' } });

    // Fill secret
    const secretInput = screen.getByPlaceholderText(/your-webhook-secret/i);
    fireEvent.change(secretInput, { target: { value: 'my-secret' } });

    // Click send
    const button = screen.getByRole('button', { name: /send webhook/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiClient.sendWebhook).toHaveBeenCalledWith({
        url: 'https://webhook.site/test',
        templateId: 'issue-alert-created',
        secret: 'my-secret',
      });
    });
  });

  it('shows loading state while sending', async () => {
    (apiClient.sendWebhook as any).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<WebhookPlayground />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'issue-alert-created' } });

    await waitFor(() => {
      expect(apiClient.getWebhookTemplate).toHaveBeenCalled();
    });

    const urlInput = screen.getByPlaceholderText(/webhook\.site/i);
    fireEvent.change(urlInput, { target: { value: 'https://webhook.site/test' } });

    const button = screen.getByRole('button', { name: /send webhook/i });
    fireEvent.click(button);

    // Should show loading state
    expect(screen.getByText(/sending/i)).toBeInTheDocument();
  });

  it('displays success response', async () => {
    const mockResponse = {
      success: true,
      sentAt: '2026-01-29T12:00:00.000Z',
      signature: 'abc123',
      webhookStatus: 200,
      webhookStatusText: 'OK',
    };

    (apiClient.sendWebhook as any).mockResolvedValue(mockResponse);

    render(<WebhookPlayground />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'issue-alert-created' } });

    await waitFor(() => {
      expect(apiClient.getWebhookTemplate).toHaveBeenCalled();
    });

    const urlInput = screen.getByPlaceholderText(/webhook\.site/i);
    fireEvent.change(urlInput, { target: { value: 'https://webhook.site/test' } });

    const button = screen.getByRole('button', { name: /send webhook/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/200/)).toBeInTheDocument();
      expect(screen.getByText(/OK/)).toBeInTheDocument();
    });
  });

  it('displays error when sending fails', async () => {
    (apiClient.sendWebhook as any).mockRejectedValue(
      new Error('Network error')
    );

    render(<WebhookPlayground />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'issue-alert-created' } });

    await waitFor(() => {
      expect(apiClient.getWebhookTemplate).toHaveBeenCalled();
    });

    const urlInput = screen.getByPlaceholderText(/webhook\.site/i);
    fireEvent.change(urlInput, { target: { value: 'https://webhook.site/test' } });

    const button = screen.getByRole('button', { name: /send webhook/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('allows editing payload in Monaco editor', async () => {
    render(<WebhookPlayground />);

    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    const newPayload = '{"action":"custom","data":{}}';

    fireEvent.change(editor, { target: { value: newPayload } });

    expect(editor.value).toBe(newPayload);
  });

  it('signature checkbox is checked by default', () => {
    render(<WebhookPlayground />);
    const checkbox = screen.getByRole('checkbox', { name: /generate.*signature/i }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('sends webhook without secret when unchecked', async () => {
    const mockResponse = {
      success: true,
      sentAt: '2026-01-29T12:00:00.000Z',
      webhookStatus: 200,
      webhookStatusText: 'OK',
    };

    (apiClient.sendWebhook as any).mockResolvedValue(mockResponse);

    render(<WebhookPlayground />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'issue-alert-created' } });

    await waitFor(() => {
      expect(apiClient.getWebhookTemplate).toHaveBeenCalled();
    });

    const urlInput = screen.getByPlaceholderText(/webhook\.site/i);
    fireEvent.change(urlInput, { target: { value: 'https://webhook.site/test' } });

    // Uncheck signature generation
    const checkbox = screen.getByRole('checkbox', { name: /generate.*signature/i });
    fireEvent.click(checkbox);

    const button = screen.getByRole('button', { name: /send webhook/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiClient.sendWebhook).toHaveBeenCalledWith({
        url: 'https://webhook.site/test',
        templateId: 'issue-alert-created',
        // secret should not be included
      });
    });
  });
});
