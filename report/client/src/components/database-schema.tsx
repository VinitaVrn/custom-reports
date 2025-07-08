import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDrag } from 'react-dnd';
import { Search, ChevronDown, ChevronRight, Loader2, Table, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DraggableColumn } from './draggable-column';
import type { Table as TableType } from '@/types/query';
import { fetchTables, fetchTableColumns } from '@/lib/api';

interface DatabaseSchemaProps {
  onTablesAdd?: (tables: { schema: string; table: string }[]) => void;
  onColumnsAdd?: (columns: { schema: string; table: string; columnName: string }[]) => void;
}

export function DatabaseSchema({ onTablesAdd, onColumnsAdd }: DatabaseSchemaProps = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [selectedColumns, setSelectedColumns] = useState<Record<string, Set<string>>>({});

  const { data: tablesBySchema = {}, isLoading: tablesLoading } = useQuery<Record<string, string[]>>({
    queryKey: ['remote/tables'],
    queryFn: fetchTables,
  });

  const flattenedTables: { schema: string; table: string }[] = Object.entries(tablesBySchema)
  .flatMap(([schema, tables]) =>
    tables.map(table => ({ schema, table }))
  );

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const filteredTables = flattenedTables.filter(({ table }) =>
    table.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTableSelection = (schema:string,table: string) => {
    const fullName = `${schema}.${table}`;
    const newSelected = new Set(selectedTables);
    if (newSelected.has(fullName)) {
      newSelected.delete(fullName);
    } else {
      newSelected.add(fullName);
    }
    setSelectedTables(newSelected);
  };

  const addSelected = () => {
  const selectedCols = getAllSelectedColumns(); // already includes schema

  if (selectedCols.length > 0 && onColumnsAdd) {
    onColumnsAdd(selectedCols); 
    setSelectedColumns({});
    return;
  }

  if (selectedTables.size > 0 && onTablesAdd) {
    const tablesWithSchema = Array.from(selectedTables).map((fullName) => {
      const [schema, table] = fullName.split('.');
      return { schema, table };
    });

    onTablesAdd(tablesWithSchema);
    setSelectedTables(new Set());
  }
};


  const selectAllTables = () => {
  const tableKeys = filteredTables.map(({ schema, table }) => `${schema}.${table}`);
  setSelectedTables(new Set(tableKeys));
  };

  const clearSelection = () => {
    setSelectedTables(new Set());
  };

  const toggleColumnSelection = (tableName: string, columnName: string) => {
    setSelectedColumns(prev => {
      const tableCols = prev[tableName] ? new Set(prev[tableName]) : new Set<string>();
      if (tableCols.has(columnName)) {
        tableCols.delete(columnName);
      } else {
        tableCols.add(columnName);
      }
      return { ...prev, [tableName]: tableCols };
    });
  };

  // Helper to get all selected columns as array of { tableName, columnName }
  const getAllSelectedColumns = () => {
  const result: { schema: string; table: string; columnName: string }[] = [];

  for (const [tableFullName, cols] of Object.entries(selectedColumns)) {
    const [schema, table] = tableFullName.split('.');
    for (const columnName of cols) {
      result.push({ schema, table, columnName });
    }
  }

  return result;
};

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Database Schema</h2>
        <div className="relative mb-3">
          <Input
            type="text"
            placeholder="Search tables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
        
        {/* Table Selection Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedTables.size > 0 ? `${selectedTables.size} selected` : 'Select tables'}
            </span>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllTables}
                className="text-xs"
                disabled={filteredTables.length === 0}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-xs"
                disabled={selectedTables.size === 0}
              >
                Clear
              </Button>
            </div>
          </div>
          
          {((getAllSelectedColumns().length > 0) || selectedTables.size > 0) && (
            <Button
              onClick={addSelected}
              size="sm"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {getAllSelectedColumns().length > 0
                ? `Add ${getAllSelectedColumns().length} Column${getAllSelectedColumns().length > 1 ? 's' : ''} to Query`
                : `Add ${selectedTables.size} Table${selectedTables.size > 1 ? 's' : ''} to Query`}
            </Button>
          )}
        </div>
      </div>
      
{/* Tables */}
      <div className="flex-1 overflow-y-auto p-4">
        {tablesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading schema...</span>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTables.map((tableName) => (
              <TableItem
                key={`${tableName.schema}.${tableName.table}`}
                 schema={tableName.schema}
                tableName={tableName.table}
                isExpanded={expandedTables.has(`${tableName.schema}.${tableName.table}`)}
                isSelected={selectedTables.has(`${tableName.schema}.${tableName.table}`)}
                onToggle={() => toggleTable(`${tableName.schema}.${tableName.table}`)}
                onSelect={() => toggleTableSelection(tableName.schema,tableName.table)}
                selectedColumns={selectedColumns[`${tableName.schema}.${tableName.table}`] || new Set()}
                onColumnSelect={(col) => toggleColumnSelection(`${tableName.schema}.${tableName.table}`, col)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TableItemProps {
  schema: string;
  tableName: string;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  selectedColumns: Set<string>;
  onColumnSelect: (columnName: string) => void;
}

function TableItem({ schema,tableName, isExpanded, isSelected, onToggle, onSelect, selectedColumns, onColumnSelect }: TableItemProps) {
  // const [schema, table] = tableName.split('.');
  console.log(schema,tableName)
  const fetchColumns = () => fetchTableColumns(schema, tableName);
  const { data: columns = [], isLoading: columnsLoading } = useQuery({
    queryKey: ['table-columns', tableName],
    queryFn: fetchColumns,
    enabled: isExpanded,
    staleTime: 5 * 60 * 1000,
  });

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'table',
    item: { type: 'table', tableName },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <div className="mb-2">
      <div
        ref={drag}
        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
          isSelected 
            ? 'bg-blue-100 border border-blue-300' 
            : 'bg-gray-50 hover:bg-gray-100'
        } ${isDragging ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center space-x-3 flex-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            onClick={handleCheckboxClick}
          />
          <div 
            className="flex items-center space-x-2 cursor-pointer flex-1"
            onClick={onToggle}
          >
            <div className="text-gray-300">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2 2 .9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </div>
            <Table className="h-4 w-4 text-primary" />
            <span className="font-medium text-gray-800">{tableName}</span>
          </div>
        </div>
        <div className="cursor-pointer" onClick={onToggle}>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2 ml-6 space-y-1">
          {columnsLoading ? (
            <div className="flex items-center justify-center py-2 w-full">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading columns...</span>
            </div>
          ) : (
            columns.map((column: any) => (
              <div
                key={column.column_name}
                className="flex items-center space-x-2 w-full p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm text-gray-800 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedColumns.has(column.column_name)}
                  onCheckedChange={() => onColumnSelect(column.column_name)}
                  onClick={e => e.stopPropagation()}
                />
                <span>{column.column_name}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}