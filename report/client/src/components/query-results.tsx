import { useState } from 'react';
import { Download, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { QueryResult } from '@/types/query';

interface QueryResultsProps {
  results: QueryResult | null;
  isLoading: boolean;
  sql: string;
  rowsPerPage?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  canFetchMore?: boolean;
}

export function QueryResults({ results, isLoading, sql, rowsPerPage = 20, page, onPageChange, canFetchMore }: QueryResultsProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  // Sync external page prop
  const effectivePage = page ?? currentPage;
  const handlePageChange = (newPage: number) => {
    if (onPageChange) onPageChange(newPage);
    else setCurrentPage(newPage);
  };

  const handleExport = async () => {
    if (!sql) {
      toast({
        title: "Export Error",
        description: "No query to export",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/query/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'query_results.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: "Results exported to CSV file",
      });
    } catch (error) {
      toast({
        title: "Export Error",
        description: "Failed to export results",
        variant: "destructive",
      });
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedRows = results?.rows ? [...results.rows].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const columnIndex = results.columns.indexOf(sortColumn);
    if (columnIndex === -1) return 0;
    
    const aVal = a[columnIndex];
    const bVal = b[columnIndex];
    
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    const comparison = aVal < bVal ? -1 : 1;
    return sortDirection === 'asc' ? comparison : -comparison;
  }) : [];

  return (
    <>
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-end">
          <div className="flex items-center space-x-3">
            {results && (
              <span className="text-sm text-gray-600">
                Showing {results.rows.length.toLocaleString()} rows
              </span>
            )}
            <Button
              onClick={handleExport}
              disabled={!results || results.rows.length === 0}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-auto relative flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-gray-500">Executing query...</p>
            </div>
          </div>
        ) : results && results.rows.length > 0 ? (
          <Table className="table-auto w-full">
            <TableHeader className="sticky top-0 bg-gray-50 z-10">
              <TableRow>
                {results.columns.map((column) => (
                  <TableHead 
                    key={column}
                    className="cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {column}
                      </span>
                      {sortColumn === column && (
                        sortDirection === 'asc' ? 
                          <ChevronUp className="h-3 w-3" /> : 
                          <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex} className="text-sm text-gray-900 whitespace-nowrap">
                      {cell === null || cell === undefined ? (
                        <span className="text-gray-400 italic">NULL</span>
                      ) : (
                        String(cell)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : results ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500">No results found.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500">
                Execute a query to see the results here.
              </p>
            </div>
          </div>
        )}
      </div>
      {/* Pagination Controls */}
      {results && results.rows.length > 0 && (
        <div className="flex-shrink-0 flex items-center justify-end gap-3 py-2 pr-4 border-t">
          <span className="text-base text-gray-600">
            Page {effectivePage}
          </span>
          <Button
            size="default"
            variant="ghost"
            onClick={() => handlePageChange(effectivePage - 1)}
            disabled={effectivePage === 1}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            size="default"
            variant="ghost"
            onClick={() => handlePageChange(effectivePage + 1)}
            disabled={!canFetchMore}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
    </>
  );
}
