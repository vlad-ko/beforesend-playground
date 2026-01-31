import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SdkSelector, { getLanguageForSdk, AVAILABLE_SDKS } from './SdkSelector';

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

  it('shows all available SDKs as options with versions', () => {
    const mockOnChange = vi.fn();
    render(<SdkSelector value="javascript" onChange={mockOnChange} />);

    expect(screen.getByRole('option', { name: 'JavaScript - @sentry/node 8.55.0' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Python - sentry-sdk 2.20.0' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ruby - sentry-ruby 5.22.0' })).toBeInTheDocument();
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

describe('getLanguageForSdk', () => {
  it('returns correct language for each SDK', () => {
    expect(getLanguageForSdk('javascript')).toBe('javascript');
    expect(getLanguageForSdk('python')).toBe('python');
    expect(getLanguageForSdk('ruby')).toBe('ruby');
    expect(getLanguageForSdk('php')).toBe('php');
    expect(getLanguageForSdk('go')).toBe('go');
    expect(getLanguageForSdk('dotnet')).toBe('csharp');
    expect(getLanguageForSdk('java')).toBe('java');
    expect(getLanguageForSdk('android')).toBe('kotlin');
    expect(getLanguageForSdk('cocoa')).toBe('swift');
    expect(getLanguageForSdk('react-native')).toBe('javascript');
    expect(getLanguageForSdk('rust')).toBe('rust');
    expect(getLanguageForSdk('elixir')).toBe('elixir');
  });

  it('returns javascript as default for unknown SDK', () => {
    expect(getLanguageForSdk('unknown-sdk')).toBe('javascript');
    expect(getLanguageForSdk('')).toBe('javascript');
  });
});

describe('AVAILABLE_SDKS', () => {
  it('contains all expected SDKs', () => {
    const sdkKeys = AVAILABLE_SDKS.map(sdk => sdk.key);
    expect(sdkKeys).toContain('javascript');
    expect(sdkKeys).toContain('python');
    expect(sdkKeys).toContain('ruby');
    expect(sdkKeys).toContain('php');
    expect(sdkKeys).toContain('go');
    expect(sdkKeys).toContain('dotnet');
    expect(sdkKeys).toContain('java');
    expect(sdkKeys).toContain('android');
    expect(sdkKeys).toContain('cocoa');
    expect(sdkKeys).toContain('react-native');
    expect(sdkKeys).toContain('rust');
    expect(sdkKeys).toContain('elixir');
  });

  it('each SDK has required properties', () => {
    AVAILABLE_SDKS.forEach(sdk => {
      expect(sdk).toHaveProperty('key');
      expect(sdk).toHaveProperty('name');
      expect(sdk).toHaveProperty('language');
      expect(sdk).toHaveProperty('package');
      expect(sdk).toHaveProperty('version');
    });
  });
});
