import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ModeInfo from './ModeInfo';

describe('ModeInfo', () => {
  it('renders beforeSend mode info', () => {
    render(<ModeInfo currentMode="beforeSend" />);

    expect(screen.getByText(/beforeSend callback is invoked before error events/i)).toBeInTheDocument();
    expect(screen.getByText(/Learn more in the documentation/i)).toBeInTheDocument();
  });

  it('renders beforeSendTransaction mode info', () => {
    render(<ModeInfo currentMode="beforeSendTransaction" />);

    expect(screen.getByText(/beforeSendTransaction callback is invoked before performance transaction events/i)).toBeInTheDocument();
    expect(screen.getByText(/Learn more in the documentation/i)).toBeInTheDocument();
  });

  it('renders webhooks mode info', () => {
    render(<ModeInfo currentMode="webhooks" />);

    expect(screen.getByText(/Webhooks allow you to receive HTTP callbacks/i)).toBeInTheDocument();
    expect(screen.getByText(/Learn more in the documentation/i)).toBeInTheDocument();
  });

  it('includes documentation link for beforeSend', () => {
    render(<ModeInfo currentMode="beforeSend" />);

    const link = screen.getByRole('link', { name: /Learn more in the documentation/i });
    expect(link).toHaveAttribute('href', 'https://docs.sentry.io/platform-redirect/?next=/configuration/filtering/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('includes documentation link for webhooks', () => {
    render(<ModeInfo currentMode="webhooks" />);

    const link = screen.getByRole('link', { name: /Learn more in the documentation/i });
    expect(link).toHaveAttribute('href', 'https://docs.sentry.io/product/integrations/integration-platform/webhooks/');
  });

  it('displays info icon', () => {
    const { container } = render(<ModeInfo currentMode="beforeSend" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('uses blue styling for info box', () => {
    const { container } = render(<ModeInfo currentMode="beforeSend" />);

    const infoBox = container.firstChild;
    expect(infoBox).toHaveClass('bg-blue-50');
    expect(infoBox).toHaveClass('border-blue-200');
  });
});
