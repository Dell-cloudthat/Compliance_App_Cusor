import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

/**
 * MetricCard - Reusable metric display card
 * @param {string} title - Card title
 * @param {string|number} value - Main metric value
 * @param {string} description - Description text
 * @param {ReactNode} icon - Icon component
 * @param {string} iconBgColor - Background color class for icon
 * @param {string} iconColor - Color class for icon
 * @param {number} trend - Percentage change (positive = up, negative = down)
 * @param {string} trendLabel - Label for trend
 * @param {function} onClick - Click handler
 * @param {string} className - Additional CSS classes
 */
export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  iconBgColor = 'bg-primary/10',
  iconColor = 'text-primary',
  trend,
  trendLabel,
  onClick,
  className
}) {
  const isPositive = trend > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn(
        "bg-card border border-[hsl(var(--border))] rounded-xl p-5 transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/30",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        {Icon && (
          <div className={cn("p-1.5 rounded", iconBgColor)}>
            <Icon className={cn("w-4 h-4", iconColor)} />
          </div>
        )}
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>
      
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      
      {description && (
        <div className="text-xs text-muted-foreground">{description}</div>
      )}
      
      {trend !== undefined && (
        <div className={cn(
          "flex items-center gap-1 mt-2 text-xs",
          isPositive ? "text-green-500" : "text-red-500"
        )}>
          <TrendIcon className="w-3 h-3" />
          <span>{Math.abs(trend)}%</span>
          {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
        </div>
      )}
      
      {onClick && (
        <div className="flex items-center gap-1 mt-2 text-xs text-primary">
          <span>View details</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}

/**
 * ActionCard - Card with icon and action
 */
export function ActionCard({
  title,
  value,
  description,
  icon: Icon,
  iconBgColor = 'bg-primary/10',
  iconColor = 'text-primary',
  badge,
  badgeColor = 'text-red-500 bg-red-500/10',
  onClick,
  className
}) {
  return (
    <div
      className={cn(
        "bg-card border border-[hsl(var(--border))] rounded-xl p-5 transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/30",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        {Icon && (
          <div className={cn("p-2.5 rounded-lg", iconBgColor)}>
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
        )}
        {badge && (
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", badgeColor)}>
            {badge}
          </span>
        )}
      </div>
      
      <div className="text-base font-semibold text-foreground mb-0.5">{title}</div>
      
      {value !== undefined && (
        <div className="text-lg font-bold text-foreground">{value}</div>
      )}
      
      {description && (
        <div className="text-xs text-muted-foreground mt-1">{description}</div>
      )}
    </div>
  );
}

/**
 * ScoreRing - Circular score indicator
 */
export function ScoreRing({
  score,
  size = 96,
  strokeWidth = 8,
  className
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const getStrokeColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/20"
        />
        {/* Score ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getStrokeColor(score)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("text-2xl font-bold", getScoreColor(score))}>{score}%</span>
      </div>
    </div>
  );
}

export default MetricCard;
