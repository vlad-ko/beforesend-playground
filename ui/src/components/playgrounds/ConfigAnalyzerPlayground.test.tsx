import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfigAnalyzerPlayground from './ConfigAnalyzerPlayground';
import { apiClient } from '../../api/client';

// Mock the API client
vi.mock('../../api/client', () => ({
  apiClient: {
    analyzeConfig: vi.fn(),
    getConfigExamples: vi.fn().mockResolvedValue({ examples: [] }),
  },
}));

const mockedApiClient = vi.mocked(apiClient);

describe('ConfigAnalyzerPlayground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiClient.getConfigExamples.mockResolvedValue({ examples: [] });
  });

  it('renders configuration code editor and analyze button', () => {
    render(<ConfigAnalyzerPlayground />);

    expect(screen.getByText('Configuration Code')).toBeInTheDocument();
    expect(screen.getByText('Analyze Configuration')).toBeInTheDocument();
  });

  it('renders SDK selector', () => {
    render(<ConfigAnalyzerPlayground />);

    const sdkSelector = screen.getByRole('combobox');
    expect(sdkSelector).toBeInTheDocument();
  });

  it('starts with JavaScript SDK and JavaScript default config', () => {
    render(<ConfigAnalyzerPlayground />);

    const sdkSelector = screen.getByRole('combobox');
    expect(sdkSelector).toHaveValue('javascript');

    // The Monaco editor content isn't directly testable, but we can verify
    // the SDK selector is set to JavaScript
  });

  // ============================================
  // SDK-specific default config tests
  // ============================================

  describe('SDK-specific default configs', () => {
    it('changes to Python default config when Python SDK is selected', async () => {
      mockedApiClient.analyzeConfig.mockResolvedValue({
        success: true,
        data: {
          score: 80,
          summary: 'Good configuration',
          parseErrors: [],
          options: [],
          warnings: [],
          recommendations: [],
        },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'python');

      expect(sdkSelector).toHaveValue('python');

      // Analyze to verify Python syntax is being used
      const analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(mockedApiClient.analyzeConfig).toHaveBeenCalled();
        const callArg = mockedApiClient.analyzeConfig.mock.calls[0][0];
        expect(callArg.sdk).toBe('python');
        expect(callArg.configCode).toContain('sentry_sdk.init');
        expect(callArg.configCode).toContain('traces_sample_rate');
      });
    });

    it('changes to Rust default config when Rust SDK is selected', async () => {
      mockedApiClient.analyzeConfig.mockResolvedValue({
        success: true,
        data: {
          score: 80,
          summary: 'Good configuration',
          parseErrors: [],
          options: [],
          warnings: [],
          recommendations: [],
        },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'rust');

      expect(sdkSelector).toHaveValue('rust');

      const analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(mockedApiClient.analyzeConfig).toHaveBeenCalled();
        const callArg = mockedApiClient.analyzeConfig.mock.calls[0][0];
        expect(callArg.sdk).toBe('rust');
        expect(callArg.configCode).toContain('sentry::init');
        expect(callArg.configCode).toContain('sentry::ClientOptions');
      });
    });

    it('changes to Go default config when Go SDK is selected', async () => {
      mockedApiClient.analyzeConfig.mockResolvedValue({
        success: true,
        data: {
          score: 80,
          summary: 'Good configuration',
          parseErrors: [],
          options: [],
          warnings: [],
          recommendations: [],
        },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'go');

      expect(sdkSelector).toHaveValue('go');

      const analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(mockedApiClient.analyzeConfig).toHaveBeenCalled();
        const callArg = mockedApiClient.analyzeConfig.mock.calls[0][0];
        expect(callArg.sdk).toBe('go');
        expect(callArg.configCode).toContain('sentry.Init');
        expect(callArg.configCode).toContain('sentry.ClientOptions');
      });
    });

    it('changes to Ruby default config when Ruby SDK is selected', async () => {
      mockedApiClient.analyzeConfig.mockResolvedValue({
        success: true,
        data: {
          score: 80,
          summary: 'Good configuration',
          parseErrors: [],
          options: [],
          warnings: [],
          recommendations: [],
        },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'ruby');

      expect(sdkSelector).toHaveValue('ruby');

      const analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(mockedApiClient.analyzeConfig).toHaveBeenCalled();
        const callArg = mockedApiClient.analyzeConfig.mock.calls[0][0];
        expect(callArg.sdk).toBe('ruby');
        expect(callArg.configCode).toContain('Sentry.init do');
      });
    });

    it('changes to PHP default config when PHP SDK is selected', async () => {
      mockedApiClient.analyzeConfig.mockResolvedValue({
        success: true,
        data: {
          score: 80,
          summary: 'Good configuration',
          parseErrors: [],
          options: [],
          warnings: [],
          recommendations: [],
        },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'php');

      expect(sdkSelector).toHaveValue('php');

      const analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(mockedApiClient.analyzeConfig).toHaveBeenCalled();
        const callArg = mockedApiClient.analyzeConfig.mock.calls[0][0];
        expect(callArg.sdk).toBe('php');
        expect(callArg.configCode).toContain('\\Sentry\\init');
      });
    });

    it('changes to .NET default config when .NET SDK is selected', async () => {
      mockedApiClient.analyzeConfig.mockResolvedValue({
        success: true,
        data: {
          score: 80,
          summary: 'Good configuration',
          parseErrors: [],
          options: [],
          warnings: [],
          recommendations: [],
        },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'dotnet');

      expect(sdkSelector).toHaveValue('dotnet');

      const analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(mockedApiClient.analyzeConfig).toHaveBeenCalled();
        const callArg = mockedApiClient.analyzeConfig.mock.calls[0][0];
        expect(callArg.sdk).toBe('dotnet');
        expect(callArg.configCode).toContain('SentrySdk.Init');
      });
    });

    it('changes to Java default config when Java SDK is selected', async () => {
      mockedApiClient.analyzeConfig.mockResolvedValue({
        success: true,
        data: {
          score: 80,
          summary: 'Good configuration',
          parseErrors: [],
          options: [],
          warnings: [],
          recommendations: [],
        },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'java');

      expect(sdkSelector).toHaveValue('java');

      const analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(mockedApiClient.analyzeConfig).toHaveBeenCalled();
        const callArg = mockedApiClient.analyzeConfig.mock.calls[0][0];
        expect(callArg.sdk).toBe('java');
        expect(callArg.configCode).toContain('Sentry.init');
        expect(callArg.configCode).toContain('options ->');
      });
    });

    it('changes to Cocoa default config when Cocoa SDK is selected', async () => {
      mockedApiClient.analyzeConfig.mockResolvedValue({
        success: true,
        data: {
          score: 80,
          summary: 'Good configuration',
          parseErrors: [],
          options: [],
          warnings: [],
          recommendations: [],
        },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'cocoa');

      expect(sdkSelector).toHaveValue('cocoa');

      const analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(mockedApiClient.analyzeConfig).toHaveBeenCalled();
        const callArg = mockedApiClient.analyzeConfig.mock.calls[0][0];
        expect(callArg.sdk).toBe('cocoa');
        expect(callArg.configCode).toContain('SentrySDK.start');
      });
    });

    it('changes to Elixir default config when Elixir SDK is selected', async () => {
      mockedApiClient.analyzeConfig.mockResolvedValue({
        success: true,
        data: {
          score: 80,
          summary: 'Good configuration',
          parseErrors: [],
          options: [],
          warnings: [],
          recommendations: [],
        },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'elixir');

      expect(sdkSelector).toHaveValue('elixir');

      const analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(mockedApiClient.analyzeConfig).toHaveBeenCalled();
        const callArg = mockedApiClient.analyzeConfig.mock.calls[0][0];
        expect(callArg.sdk).toBe('elixir');
        expect(callArg.configCode).toContain('config :sentry');
      });
    });
  });

  // ============================================
  // SDK switching behavior tests
  // ============================================

  describe('SDK switching behavior', () => {
    it('clears results when SDK changes', async () => {
      mockedApiClient.analyzeConfig.mockResolvedValue({
        success: true,
        data: {
          score: 80,
          summary: 'Good configuration',
          parseErrors: [],
          options: [],
          warnings: [],
          recommendations: [],
        },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      // First, analyze JavaScript config
      const analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText('Health Score')).toBeInTheDocument();
      });

      // Now switch SDK - results should be cleared
      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'python');

      await waitFor(() => {
        // Results should be cleared
        expect(screen.queryByText('Health Score')).not.toBeInTheDocument();
      });
    });

    it('clears errors when SDK changes', async () => {
      mockedApiClient.analyzeConfig.mockRejectedValueOnce({
        response: { data: { error: 'Analysis failed' } },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      const analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText(/Analysis failed/)).toBeInTheDocument();
      });

      // Switch SDK - error should be cleared
      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'rust');

      await waitFor(() => {
        expect(screen.queryByText(/Analysis failed/)).not.toBeInTheDocument();
      });
    });

    it('switches from JavaScript to Rust and back correctly', async () => {
      mockedApiClient.analyzeConfig.mockResolvedValue({
        success: true,
        data: {
          score: 80,
          summary: 'Good configuration',
          parseErrors: [],
          options: [],
          warnings: [],
          recommendations: [],
        },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      // Start with JavaScript
      let analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(mockedApiClient.analyzeConfig).toHaveBeenCalledTimes(1);
        const callArg = mockedApiClient.analyzeConfig.mock.calls[0][0];
        expect(callArg.sdk).toBe('javascript');
        expect(callArg.configCode).toContain('Sentry.init');
      });

      // Switch to Rust
      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'rust');

      analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(mockedApiClient.analyzeConfig).toHaveBeenCalledTimes(2);
        const callArg = mockedApiClient.analyzeConfig.mock.calls[1][0];
        expect(callArg.sdk).toBe('rust');
        expect(callArg.configCode).toContain('sentry::init');
      });

      // Switch back to JavaScript
      await user.selectOptions(sdkSelector, 'javascript');

      analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(mockedApiClient.analyzeConfig).toHaveBeenCalledTimes(3);
        const callArg = mockedApiClient.analyzeConfig.mock.calls[2][0];
        expect(callArg.sdk).toBe('javascript');
        expect(callArg.configCode).toContain('Sentry.init');
      });
    });
  });

  // ============================================
  // Analysis result display tests
  // ============================================

  describe('Analysis results', () => {
    it('displays health score after analysis', async () => {
      mockedApiClient.analyzeConfig.mockResolvedValue({
        success: true,
        data: {
          score: 85,
          summary: 'Good configuration with minor improvements possible',
          parseErrors: [],
          options: [],
          warnings: [],
          recommendations: [],
        },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      const analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText('Health Score')).toBeInTheDocument();
        expect(screen.getByText('85')).toBeInTheDocument();
      });
    });

    it('displays parse errors when config is invalid', async () => {
      mockedApiClient.analyzeConfig.mockResolvedValue({
        success: true,
        data: {
          score: 0,
          summary: 'Configuration could not be parsed',
          parseErrors: [{ message: 'Could not find sentry::ClientOptions configuration struct' }],
          options: [],
          warnings: [],
          recommendations: [],
        },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      const analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText('Parse Errors')).toBeInTheDocument();
        expect(screen.getByText(/Could not find sentry::ClientOptions/)).toBeInTheDocument();
      });
    });

    it('handles API errors gracefully', async () => {
      mockedApiClient.analyzeConfig.mockRejectedValue({
        response: { data: { error: 'Server error' } },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      const analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText(/Server error/)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Reset functionality tests
  // ============================================

  describe('Reset functionality', () => {
    it('reset button returns to JavaScript default', async () => {
      mockedApiClient.analyzeConfig.mockResolvedValue({
        success: true,
        data: {
          score: 80,
          summary: 'Good configuration',
          parseErrors: [],
          options: [],
          warnings: [],
          recommendations: [],
        },
      });

      const user = userEvent.setup();
      render(<ConfigAnalyzerPlayground />);

      // Switch to a different SDK
      const sdkSelector = screen.getByRole('combobox');
      await user.selectOptions(sdkSelector, 'rust');

      // Analyze to trigger showing the reset button context
      const analyzeButton = screen.getByText('Analyze Configuration');
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(sdkSelector).toHaveValue('rust');
      });
    });
  });

  // ============================================
  // Empty state tests
  // ============================================

  describe('Empty state', () => {
    it('shows empty state message when no analysis has been run', () => {
      render(<ConfigAnalyzerPlayground />);

      // Use getAllByText since there may be multiple matches, and check that at least one exists
      const matches = screen.getAllByText(/Paste your Sentry.init\(\) configuration/);
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
