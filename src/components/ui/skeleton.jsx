import { cn } from "@/lib/utils"

/**
 * Base Skeleton Component
 * Animated placeholder for loading states
 */
function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  )
}

/**
 * Card Skeleton - For loading card-style content
 */
function CardSkeleton({ className }) {
  return (
    <div className={cn("bg-card border border-[hsl(var(--border))] rounded-xl p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-5 w-24 mb-2" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

/**
 * Metric Card Skeleton - For dashboard metric cards
 */
function MetricCardSkeleton({ className }) {
  return (
    <div className={cn("bg-card border border-[hsl(var(--border))] rounded-xl p-5", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

/**
 * Table Row Skeleton
 */
function TableRowSkeleton({ columns = 5, className }) {
  return (
    <div className={cn("flex items-center gap-4 p-4 border-b border-[hsl(var(--border))]", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            i === 0 ? "w-32" : i === columns - 1 ? "w-20" : "w-24"
          )} 
        />
      ))}
    </div>
  )
}

/**
 * Table Skeleton - Full table loading state
 */
function TableSkeleton({ rows = 5, columns = 5, className }) {
  return (
    <div className={cn("bg-card border border-[hsl(var(--border))] rounded-xl overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 border-b border-[hsl(var(--border))]">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  )
}

/**
 * Alert Skeleton - For alert cards
 */
function AlertSkeleton({ className }) {
  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-lg border border-[hsl(var(--border))]", className)}>
      <Skeleton className="h-8 w-8 rounded shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-16 rounded shrink-0" />
    </div>
  )
}

/**
 * List Item Skeleton
 */
function ListItemSkeleton({ className }) {
  return (
    <div className={cn("flex items-center gap-4 p-3 rounded-lg", className)}>
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-6 w-16 rounded" />
    </div>
  )
}

/**
 * Chart Skeleton - For charts and graphs
 */
function ChartSkeleton({ className }) {
  return (
    <div className={cn("bg-card border border-[hsl(var(--border))] rounded-xl p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1 rounded-t"
            style={{ height: `${Math.random() * 60 + 40}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-12" />
        ))}
      </div>
    </div>
  )
}

/**
 * Dashboard Skeleton - Full dashboard loading state
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-[hsl(var(--border))] rounded-xl p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-72" />
          </div>
          <div className="flex items-center gap-6">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="text-right">
              <Skeleton className="h-12 w-16 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts Section */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <AlertSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Framework Health Section */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Controls Table Skeleton
 */
function ControlsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      {/* Table */}
      <TableSkeleton rows={8} columns={6} />
    </div>
  )
}

/**
 * Page Loading Skeleton - Full page loader
 */
function PageLoadingSkeleton({ title = "Loading..." }) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-muted border-t-primary animate-spin" />
      </div>
      <p className="mt-4 text-muted-foreground">{title}</p>
    </div>
  )
}

export { 
  Skeleton,
  CardSkeleton,
  MetricCardSkeleton,
  TableRowSkeleton,
  TableSkeleton,
  AlertSkeleton,
  ListItemSkeleton,
  ChartSkeleton,
  DashboardSkeleton,
  ControlsTableSkeleton,
  PageLoadingSkeleton
}
