import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SdkSelector from './SdkSelector';

describe('SdkSelector', () => {
  it('renders SDK label and dropdown', () => {
    const mockOnChange = vi.fn();
    render(<SdkSelector value="javascript" onChange={mockOnChange} />);

    expect(screen.getByText('SDK:')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays current SDK value', () => {
    const mockOnChange = vi.fn();
    render(<SdkSelector value="javascript" onChange={mockOnChange} />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('javascript');
  });

  it('shows all available SDKs as options', () => {
    const mockOnChange = vi.fn();
    render(<SdkSelector value="javascript" onChange={mockOnChange} />);

    expect(screen.getByRole('option', { name: 'JavaScript (@sentry/node)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Python (sentry-sdk)' })).toBeInTheDocument();
  });

  it('calls onChange when SDK is selected', async () => {
    const mockOnChange = vi.fn();
    const user = userEvent.setup();
    render(<SdkSelector value="javascript" onChange={mockOnChange} />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'python');

    expect(mockOnChange).toHaveBeenCalledWith('python');
  });

  it('can switch between SDKs', async () => {
    const mockOnChange = vi.fn();
    const user = userEvent.setup();
    render(<SdkSelector value="javascript" onChange={mockOnChange} />);

    const select = screen.getByRole('combobox');

    await user.selectOptions(select, 'python');
    expect(mockOnChange).toHaveBeenCalledWith('python');

    await user.selectOptions(select, 'javascript');
    expect(mockOnChange).toHaveBeenCalledWith('javascript');
  });
});
