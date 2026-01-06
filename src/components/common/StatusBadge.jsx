import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, Clock, XCircle, AlertTriangle, Shield } from 'lucide-react';

/**
 * Status badge configurations
 */
const STATUS_CONFIG = {
  // Control statuses
  'Implemented': { 
    icon: CheckCircle, 
    bgColor: 'bg-green-500/10', 
    textColor: 'text-green-500',
    borderColor: 'border-green-500/20'
  },
  'Compliant': { 
    icon: CheckCircle, 
    bgColor: 'bg-green-500/10', 
    textColor: 'text-green-500',
    borderColor: 'border-green-500/20'
  },
  'Partial': { 
    icon: Clock, 
    bgColor: 'bg-yellow-500/10', 
    textColor: 'text-yellow-500',
    borderColor: 'border-yellow-500/20'
  },
  'Not Implemented': { 
    icon: XCircle, 
    bgColor: 'bg-red-500/10', 
    textColor: 'text-red-500',
    borderColor: 'border-red-500/20'
  },
  'Non-Compliant': { 
    icon: XCircle, 
    bgColor: 'bg-red-500/10', 
    textColor: 'text-red-500',
    borderColor: 'border-red-500/20'
  },
  'Vendor Managed': { 
    icon: Shield, 
    bgColor: 'bg-blue-500/10', 
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/20'
  },
  
  // Alert/Severity statuses
  'critical': { 
    icon: AlertCircle, 
    bgColor: 'bg-red-500/10', 
    textColor: 'text-red-500',
    borderColor: 'border-red-500/20'
  },
  'high': { 
    icon: AlertTriangle, 
    bgColor: 'bg-orange-500/10', 
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500/20'
  },
  'medium': { 
    icon: AlertTriangle, 
    bgColor: 'bg-yellow-500/10', 
    textColor: 'text-yellow-500',
    borderColor: 'border-yellow-500/20'
  },
  'low': { 
    icon: AlertCircle, 
    bgColor: 'bg-blue-500/10', 
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/20'
  },
  'info': { 
    icon: AlertCircle, 
    bgColor: 'bg-gray-500/10', 
    textColor: 'text-gray-500',
    borderColor: 'border-gray-500/20'
  },
  
  // Audit/Workflow statuses
  'open': { 
    icon: AlertCircle, 
    bgColor: 'bg-blue-500/10', 
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/20'
  },
  'in_progress': { 
    icon: Clock, 
    bgColor: 'bg-yellow-500/10', 
    textColor: 'text-yellow-500',
    borderColor: 'border-yellow-500/20'
  },
  'resolved': { 
    icon: CheckCircle, 
    bgColor: 'bg-green-500/10', 
    textColor: 'text-green-500',
    borderColor: 'border-green-500/20'
  },
  'closed': { 
    icon: CheckCircle, 
    bgColor: 'bg-gray-500/10', 
    textColor: 'text-gray-500',
    borderColor: 'border-gray-500/20'
  },
  'pending': { 
    icon: Clock, 
    bgColor: 'bg-yellow-500/10', 
    textColor: 'text-yellow-500',
    borderColor: 'border-yellow-500/20'
  },
  'planned': { 
    icon: Clock, 
    bgColor: 'bg-blue-500/10', 
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/20'
  },
  'completed': { 
    icon: CheckCircle, 
    bgColor: 'bg-green-500/10', 
    textColor: 'text-green-500',
    borderColor: 'border-green-500/20'
  },
  'active': { 
    icon: CheckCircle, 
    bgColor: 'bg-green-500/10', 
    textColor: 'text-green-500',
    borderColor: 'border-green-500/20'
  },
  
  // Default
  'default': { 
    icon: AlertCircle, 
    bgColor: 'bg-gray-500/10', 
    textColor: 'text-gray-500',
    borderColor: 'border-gray-500/20'
  }
};

/**
 * StatusBadge - Reusable status indicator
 * @param {string} status - Status string
 * @param {boolean} showIcon - Whether to show the icon
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 * @param {boolean} bordered - Whether to show border
 * @param {string} className - Additional classes
 */
export function StatusBadge({ 
  status, 
  showIcon = true, 
  size = 'sm',
  bordered = false,
  className 
}) {
  const normalizedStatus = status?.toLowerCase?.() || 'default';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.default;
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
      config.bgColor,
      config.textColor,
      bordered && `border ${config.borderColor}`,
      sizeClasses[size],
      className
    )}>
      {showIcon && Icon && <Icon className={iconSizes[size]} />}
      {status}
    </span>
  );
}

/**
 * SeverityDot - Simple colored dot for severity
 */
export function SeverityDot({ severity, size = 'sm', className }) {
  const colors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
    info: 'bg-gray-500'
  };
  
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <span 
      className={cn(
        "rounded-full",
        colors[severity?.toLowerCase?.()] || colors.info,
        sizes[size],
        className
      )} 
    />
  );
}

export default StatusBadge;
