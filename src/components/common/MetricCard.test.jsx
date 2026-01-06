import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetricCard, ActionCard, ScoreRing } from './MetricCard';
import { TrendingUp, Shield } from 'lucide-react';

describe('MetricCard', () => {
  it('renders with title and value', () => {
    render(<MetricCard title="Test Metric" value="42" />);
    
    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <MetricCard 
        title="Test" 
        value="100" 
        description="Test description" 
      />
    );
    
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(
      <MetricCard 
        title="Test" 
        value="50" 
        icon={Shield}
      />
    );
    
    // Icon should be rendered (as SVG)
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders positive trend', () => {
    render(
      <MetricCard 
        title="Test" 
        value="75" 
        trend={15}
        trendLabel="vs last month"
      />
    );
    
    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('renders negative trend', () => {
    render(
      <MetricCard 
        title="Test" 
        value="60" 
        trend={-10}
      />
    );
    
    expect(screen.getByText('10%')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(
      <MetricCard 
        title="Clickable" 
        value="100" 
        onClick={handleClick}
      />
    );
    
    fireEvent.click(screen.getByText('Clickable'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows "View details" when onClick is provided', () => {
    render(
      <MetricCard 
        title="Test" 
        value="50" 
        onClick={() => {}}
      />
    );
    
    expect(screen.getByText('View details')).toBeInTheDocument();
  });
});

describe('ActionCard', () => {
  it('renders with title and description', () => {
    render(
      <ActionCard 
        title="Action Card" 
        description="Card description"
      />
    );
    
    expect(screen.getByText('Action Card')).toBeInTheDocument();
    expect(screen.getByText('Card description')).toBeInTheDocument();
  });

  it('renders with badge', () => {
    render(
      <ActionCard 
        title="Test" 
        badge="3 new"
      />
    );
    
    expect(screen.getByText('3 new')).toBeInTheDocument();
  });

  it('renders with value', () => {
    render(
      <ActionCard 
        title="Test" 
        value="150"
      />
    );
    
    expect(screen.getByText('150')).toBeInTheDocument();
  });
});

describe('ScoreRing', () => {
  it('renders with score', () => {
    render(<ScoreRing score={85} />);
    
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    const { container } = render(<ScoreRing score={50} size={120} />);
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '120');
    expect(svg).toHaveAttribute('height', '120');
  });

  it('uses green color for high scores', () => {
    render(<ScoreRing score={90} />);
    
    // Score should have green text
    const scoreText = screen.getByText('90%');
    expect(scoreText).toHaveClass('text-green-500');
  });

  it('uses yellow color for medium scores', () => {
    render(<ScoreRing score={70} />);
    
    const scoreText = screen.getByText('70%');
    expect(scoreText).toHaveClass('text-yellow-500');
  });

  it('uses red color for low scores', () => {
    render(<ScoreRing score={40} />);
    
    const scoreText = screen.getByText('40%');
    expect(scoreText).toHaveClass('text-red-500');
  });
});
