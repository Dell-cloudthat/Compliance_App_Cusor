import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  Search, Filter, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  MoreVertical, Download, RefreshCw
} from 'lucide-react';

/**
 * DataTable - Reusable data table with sorting, filtering, and pagination
 */
export function DataTable({
  data = [],
  columns = [],
  searchable = true,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  sortable = true,
  paginated = true,
  pageSize = 10,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  onRowClick,
  actions,
  bulkActions,
  emptyMessage = 'No data available',
  loading = false,
  className
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set(selectedRows));

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    const searchLower = searchTerm.toLowerCase();
    return data.filter(row => {
      // If searchKeys provided, only search those keys
      if (searchKeys.length > 0) {
        return searchKeys.some(key => {
          const value = row[key];
          return value && String(value).toLowerCase().includes(searchLower);
        });
      }
      // Otherwise search all string values
      return Object.values(row).some(value => 
        value && String(value).toLowerCase().includes(searchLower)
      );
    });
  }, [data, searchTerm, searchKeys]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!paginated) return sortedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, paginated]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key) => {
    if (!sortable) return;
    
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = new Set(paginatedData.map(row => row.id));
      setSelectedIds(allIds);
      onSelectionChange?.(Array.from(allIds));
    } else {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  const allSelected = paginatedData.length > 0 && paginatedData.every(row => selectedIds.has(row.id));

  return (
    <div className={cn("bg-card border border-[hsl(var(--border))] rounded-xl overflow-hidden", className)}>
      {/* Toolbar */}
      {(searchable || bulkActions || actions) && (
        <div className="flex items-center justify-between gap-4 p-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            {/* Search */}
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 py-2 w-64 text-sm bg-background border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}
            
            {/* Bulk actions (shown when rows selected) */}
            {selectable && selectedIds.size > 0 && bulkActions && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
                {bulkActions}
              </div>
            )}
          </div>
          
          {/* Right side actions */}
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30 border-b border-[hsl(var(--border))]">
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-[hsl(var(--border))]"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider",
                    sortable && col.sortable !== false && "cursor-pointer hover:text-foreground",
                    col.className
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {sortable && col.sortable !== false && sortConfig.key === col.key && (
                      sortConfig.direction === 'asc' 
                        ? <ChevronUp className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center">
                  <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className={cn(
                    "transition-colors",
                    onRowClick && "cursor-pointer hover:bg-muted/50",
                    selectedIds.has(row.id) && "bg-primary/5"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        className="rounded border-[hsl(var(--border))]"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td 
                      key={col.key} 
                      className={cn("px-4 py-3 text-sm", col.cellClassName)}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--border))]">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "w-8 h-8 rounded text-sm font-medium",
                    currentPage === pageNum 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
