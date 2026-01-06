import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, SeverityDot } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders with status text', () => {
    render(<StatusBadge status="Implemented" />);
    
    expect(screen.getByText('Implemented')).toBeInTheDocument();
  });

  it('renders with icon by default', () => {
    render(<StatusBadge status="Implemented" />);
    
    // Should have an SVG icon
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('hides icon when showIcon is false', () => {
    render(<StatusBadge status="Implemented" showIcon={false} />);
    
    // Should not have an SVG icon
    expect(document.querySelector('svg')).not.toBeInTheDocument();
  });

  it('applies correct color classes for Implemented status', () => {
    render(<StatusBadge status="Implemented" />);
    
    // The span containing the text itself has the classes
    const badge = screen.getByText('Implemented').closest('span');
    expect(badge).toHaveClass('bg-green-500/10');
    expect(badge).toHaveClass('text-green-500');
  });

  it('renders Partial status', () => {
    render(<StatusBadge status="Partial" />);
    expect(screen.getByText('Partial')).toBeInTheDocument();
  });

  it('renders Not Implemented status', () => {
    render(<StatusBadge status="Not Implemented" />);
    expect(screen.getByText('Not Implemented')).toBeInTheDocument();
  });

  it('renders Vendor Managed status', () => {
    render(<StatusBadge status="Vendor Managed" />);
    expect(screen.getByText('Vendor Managed')).toBeInTheDocument();
  });

  it('renders critical severity', () => {
    render(<StatusBadge status="critical" />);
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('renders high severity', () => {
    render(<StatusBadge status="high" />);
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('renders with small size', () => {
    render(<StatusBadge status="Test" size="sm" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders with medium size', () => {
    render(<StatusBadge status="Test" size="md" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders with large size', () => {
    render(<StatusBadge status="Test" size="lg" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders with bordered prop', () => {
    render(<StatusBadge status="Implemented" bordered />);
    expect(screen.getByText('Implemented')).toBeInTheDocument();
  });

  it('handles unknown status gracefully', () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });
});

describe('SeverityDot', () => {
  it('renders with correct color for critical severity', () => {
    const { container } = render(<SeverityDot severity="critical" />);
    
    const dot = container.querySelector('span');
    expect(dot).toHaveClass('bg-red-500');
  });

  it('renders with correct color for high severity', () => {
    const { container } = render(<SeverityDot severity="high" />);
    
    const dot = container.querySelector('span');
    expect(dot).toHaveClass('bg-orange-500');
  });

  it('renders with correct color for medium severity', () => {
    const { container } = render(<SeverityDot severity="medium" />);
    
    const dot = container.querySelector('span');
    expect(dot).toHaveClass('bg-yellow-500');
  });

  it('renders with correct color for low severity', () => {
    const { container } = render(<SeverityDot severity="low" />);
    
    const dot = container.querySelector('span');
    expect(dot).toHaveClass('bg-blue-500');
  });

  it('applies correct size classes', () => {
    const { container: smallContainer } = render(<SeverityDot severity="high" size="sm" />);
    const { container: lgContainer } = render(<SeverityDot severity="high" size="lg" />);
    
    expect(smallContainer.querySelector('span')).toHaveClass('w-2', 'h-2');
    expect(lgContainer.querySelector('span')).toHaveClass('w-4', 'h-4');
  });
});
