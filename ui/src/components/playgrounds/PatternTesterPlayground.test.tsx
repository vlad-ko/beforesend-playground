import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatternTesterPlayground from './PatternTesterPlayground';

describe('PatternTesterPlayground', () => {
  it('renders filter type selector buttons', () => {
    render(<PatternTesterPlayground />);

    expect(screen.getByRole('button', { name: 'ignoreErrors' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'denyUrls' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'allowUrls' })).toBeInTheDocument();
  });

  it('renders main sections', () => {
    render(<PatternTesterPlayground />);

    expect(screen.getByText('Filter Type')).toBeInTheDocument();
    expect(screen.getByText('Results')).toBeInTheDocument();
    expect(screen.getByText('Generated Code')).toBeInTheDocument();
  });

  it('loads default patterns on render', () => {
    render(<PatternTesterPlayground />);

    // Check for default ignoreErrors pattern in the patterns section
    const patternsSection = screen.getByText(/Patterns \(\d+\)/).closest('div');
    expect(patternsSection).toBeInTheDocument();
  });

  it('switches filter types', async () => {
    const user = userEvent.setup();
    render(<PatternTesterPlayground />);

    // Click denyUrls button
    await user.click(screen.getByRole('button', { name: 'denyUrls' }));

    // Should show denyUrls description
    expect(screen.getByText(/script that caused the error/)).toBeInTheDocument();

    // Click allowUrls button
    await user.click(screen.getByRole('button', { name: 'allowUrls' }));

    // Should show allowUrls description
    expect(screen.getByText(/ONLY matching URLs/)).toBeInTheDocument();
  });

  it('shows results section with match counts', () => {
    render(<PatternTesterPlayground />);

    // Results should be calculated on initial render
    expect(screen.getByText(/\d+ matched/)).toBeInTheDocument();
    expect(screen.getByText(/\d+ not matched/)).toBeInTheDocument();
  });

  it('shows generated code section', () => {
    render(<PatternTesterPlayground />);

    expect(screen.getByText('Generated Code')).toBeInTheDocument();
    expect(screen.getByText(/Copy this configuration/)).toBeInTheDocument();
    expect(screen.getByText('Copy to Clipboard')).toBeInTheDocument();
  });

  it('can copy generated code to clipboard', async () => {
    const user = userEvent.setup();

    // Mock clipboard using Object.defineProperty since navigator.clipboard is read-only
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(<PatternTesterPlayground />);

    await user.click(screen.getByText('Copy to Clipboard'));

    expect(writeTextMock).toHaveBeenCalled();
  });

  it('shows pattern type labels (regex and string)', () => {
    render(<PatternTesterPlayground />);

    // Default ignoreErrors has both regex and string patterns
    expect(screen.getAllByText('regex').length).toBeGreaterThan(0);
    expect(screen.getAllByText('string').length).toBeGreaterThan(0);
  });

  it('shows result status labels', () => {
    render(<PatternTesterPlayground />);

    // For ignoreErrors, matched items show FILTERED, unmatched show SENT
    const hasFiltered = screen.queryAllByText('FILTERED').length > 0;
    const hasSent = screen.queryAllByText('SENT').length > 0;

    expect(hasFiltered || hasSent).toBe(true);
  });

  it('has reset to defaults button', () => {
    render(<PatternTesterPlayground />);

    expect(screen.getByText('Reset to defaults')).toBeInTheDocument();
  });

  it('has add buttons for patterns and test cases', () => {
    render(<PatternTesterPlayground />);

    const addButtons = screen.getAllByText('Add');
    expect(addButtons.length).toBe(2); // One for patterns, one for test cases
  });
});
