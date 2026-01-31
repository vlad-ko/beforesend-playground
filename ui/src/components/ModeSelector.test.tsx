import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModeSelector from './ModeSelector';
import { PlaygroundMode } from '../types/modes';

describe('ModeSelector', () => {
  it('renders all mode tabs', () => {
    const mockOnChange = vi.fn();
    render(<ModeSelector currentMode="beforeSend" onModeChange={mockOnChange} />);

    expect(screen.getByRole('button', { name: 'Before Send' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Before Send Transaction' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Webhooks' })).toBeInTheDocument();
  });

  it('highlights the current mode', () => {
    const mockOnChange = vi.fn();
    render(<ModeSelector currentMode="beforeSend" onModeChange={mockOnChange} />);

    const beforeSendTab = screen.getByRole('button', { name: 'Before Send' });
    expect(beforeSendTab).toHaveClass('bg-blue-600');
  });

  it('calls onModeChange when a tab is clicked', async () => {
    const mockOnChange = vi.fn();
    const user = userEvent.setup();
    render(<ModeSelector currentMode="beforeSend" onModeChange={mockOnChange} />);

    const webhooksTab = screen.getByRole('button', { name: 'Webhooks' });
    await user.click(webhooksTab);

    expect(mockOnChange).toHaveBeenCalledWith('webhooks');
  });

  it('can switch between modes', async () => {
    const mockOnChange = vi.fn();
    const user = userEvent.setup();
    render(<ModeSelector currentMode="beforeSend" onModeChange={mockOnChange} />);

    const transactionTab = screen.getByRole('button', { name: 'Before Send Transaction' });
    await user.click(transactionTab);
    expect(mockOnChange).toHaveBeenCalledWith('beforeSendTransaction');

    const webhooksTab = screen.getByRole('button', { name: 'Webhooks' });
    await user.click(webhooksTab);
    expect(mockOnChange).toHaveBeenCalledWith('webhooks');
  });

  it('shows mode descriptions on hover', () => {
    const mockOnChange = vi.fn();
    render(<ModeSelector currentMode="beforeSend" onModeChange={mockOnChange} />);

    const beforeSendTab = screen.getByRole('button', { name: 'Before Send' });
    expect(beforeSendTab).toHaveAttribute('title', 'Transform error events before they are sent to Sentry');
  });
});
