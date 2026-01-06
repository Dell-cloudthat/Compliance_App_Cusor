import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Clock, CheckCircle, ChevronRight, ExternalLink } from 'lucide-react';
import { StatusBadge, SeverityDot } from './StatusBadge';

/**
 * Alert severity configuration
 */
const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-500',
    borderColor: 'border-l-red-500'
  },
  high: {
    icon: AlertTriangle,
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
    borderColor: 'border-l-orange-500'
  },
  medium: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-500',
    borderColor: 'border-l-yellow-500'
  },
  low: {
    icon: AlertCircle,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    borderColor: 'border-l-blue-500'
  },
  info: {
    icon: AlertCircle,
    iconBg: 'bg-gray-500/10',
    iconColor: 'text-gray-500',
    borderColor: 'border-l-gray-500'
  }
};

/**
 * AlertItem - Single alert item
 */
export function AlertItem({
  id,
  title,
  description,
  severity = 'medium',
  status = 'open',
  framework,
  controlId,
  createdAt,
  onClick,
  onAcknowledge,
  onResolve,
  showActions = true,
  className
}) {
  const config = SEVERITY_CONFIG[severity?.toLowerCase?.()] || SEVERITY_CONFIG.medium;
  const Icon = config.icon;
  
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border border-[hsl(var(--border))] border-l-4 transition-colors",
        config.borderColor,
        onClick && "cursor-pointer hover:bg-muted/50",
        className
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className={cn("p-2 rounded-lg shrink-0", config.iconBg)}>
        <Icon className={cn("w-4 h-4", config.iconColor)} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-foreground truncate">{title}</h4>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
            )}
          </div>
          <StatusBadge status={severity} size="sm" />
        </div>
        
        {/* Metadata */}
        <div className="flex items-center gap-3 mt-2">
          {framework && (
            <span className="text-xs text-muted-foreground">
              {framework}
            </span>
          )}
          {controlId && (
            <span className="text-xs text-primary">
              {controlId}
            </span>
          )}
          {createdAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(createdAt)}
            </span>
          )}
        </div>
        
        {/* Actions */}
        {showActions && (onAcknowledge || onResolve) && status !== 'resolved' && (
          <div className="flex items-center gap-2 mt-2">
            {onAcknowledge && status === 'open' && (
              <button
                onClick={(e) => { e.stopPropagation(); onAcknowledge(id); }}
                className="text-xs text-primary hover:underline"
              >
                Acknowledge
              </button>
            )}
            {onResolve && (
              <button
                onClick={(e) => { e.stopPropagation(); onResolve(id); }}
                className="text-xs text-green-500 hover:underline"
              >
                Resolve
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Arrow */}
      {onClick && (
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
    </div>
  );
}

/**
 * AlertList - List of alerts with optional grouping
 */
export function AlertList({
  alerts = [],
  title,
  showViewAll = false,
  onViewAll,
  onAlertClick,
  onAcknowledge,
  onResolve,
  maxItems = 5,
  emptyMessage = 'No alerts',
  className
}) {
  const displayAlerts = alerts.slice(0, maxItems);
  const hasMore = alerts.length > maxItems;

  return (
    <div className={cn("bg-card border border-[hsl(var(--border))] rounded-xl", className)}>
      {/* Header */}
      {(title || showViewAll) && (
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
          {title && (
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              {title}
              {alerts.length > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {alerts.length}
                </span>
              )}
            </h3>
          )}
          {showViewAll && onViewAll && alerts.length > 0 && (
            <button
              onClick={onViewAll}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
      
      {/* Alert items */}
      <div className="p-4 space-y-3">
        {displayAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-50" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          displayAlerts.map((alert, index) => (
            <AlertItem
              key={alert.id || index}
              {...alert}
              onClick={() => onAlertClick?.(alert)}
              onAcknowledge={onAcknowledge}
              onResolve={onResolve}
            />
          ))
        )}
        
        {hasMore && (
          <button
            onClick={onViewAll}
            className="w-full py-2 text-sm text-primary hover:bg-muted/50 rounded-lg transition-colors"
          >
            +{alerts.length - maxItems} more alerts
          </button>
        )}
      </div>
    </div>
  );
}

export default AlertList;
