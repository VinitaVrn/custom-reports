import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Hash, Plus, Calendar, X, Link } from 'lucide-react';
import type { QueryConfig, QueryCondition, QueryJoin } from '@/types/query';
import { SQL_FUNCTIONS, SQL_OPERATORS } from '@/types/query';
import { fetchTableColumns, fetchTables } from '@/lib/api';

interface QueryConfigurationProps {
  config: QueryConfig;
  onChange: (config: QueryConfig) => void;
  validation: { isValid: boolean; errors: string[] };
}

export function QueryConfiguration({ config, onChange, validation }: QueryConfigurationProps) {
  const [columnsCache, setColumnsCache] = useState<Record<string, Array<{ column_name: string }>>>({});
  const [availableColumns, setAvailableColumns] = useState<Array<{ value: string; label: string; table: string }>>([]);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);
  const [errorTables, setErrorTables] = useState<string[]>([]);

  // Get all tables involved in the query (selected tables + joined tables)
  const allTables = Array.from(new Set([
    ...config.selectedTables,
    ...config.joins.map(join => join.leftTable),
    ...config.joins.map(join => join.rightTable)
  ]));

  // Fetch all tables data once
  const { data: allTablesData } = useQuery({
    queryKey: ['remote/tables'],
    queryFn: fetchTables,
  });

  useEffect(() => {
    const fetchMissingColumns = async () => {
      setIsLoadingColumns(true);
      const missingTables = allTables.filter(table => table && !(table in columnsCache));
      const newCache: Record<string, Array<{ column_name: string }>> = { ...columnsCache };
      const newErrorTables: string[] = [];
      for (const tableName of missingTables) {
        try {
          const columns = await fetchTableColumns('public', tableName);
          if (Array.isArray(columns) && columns.length > 0) {
            newCache[tableName] = columns.filter((col: any) => col.column_name && col.column_name.trim());
          } else {
            newCache[tableName] = [];
            newErrorTables.push(tableName);
            console.warn(`No columns found for table: ${tableName}`);
          }
        } catch (error) {
          newCache[tableName] = [];
          newErrorTables.push(tableName);
          console.error(`Error fetching columns for ${tableName}:`, error);
        }
      }
      setColumnsCache(newCache);
      setErrorTables(newErrorTables);
      setIsLoadingColumns(false);
    };
    if (allTables.length > 0) {
      fetchMissingColumns();
    } else {
      setAvailableColumns([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTables.join(','), columnsCache]);

  // Build availableColumns from cache
  useEffect(() => {
    const allColumns: Array<{ value: string; label: string; table: string }> = [];
    for (const tableName of allTables) {
      const columns = columnsCache[tableName] || [];
      columns.forEach((column: any) => {
        allColumns.push({
          value: `${tableName}.${column.column_name}`,
          label: `${tableName}.${column.column_name}`,
          table: tableName
        });
      });
    }
    setAvailableColumns(allColumns);
  }, [columnsCache, allTables.join(',')]);

  // Column management functions
  const addToGroupBy = (column: string) => {
    if (!config.groupBy.includes(column)) {
      onChange({ ...config, groupBy: [...config.groupBy, column] });
    }
  };

  const removeFromGroupBy = (column: string) => {
    const newGroupBy = config.groupBy.filter(col => col !== column);
    onChange({ ...config, groupBy: newGroupBy });
  };

  // JOIN management functions
  const addJoin = () => {
    const newJoin: QueryJoin = {
      id: `join_${Date.now()}`,
      type: 'INNER',
      leftTable: config.selectedTables[0] || '',
      leftColumn: '',
      rightTable: config.selectedTables[1] || '',
      rightColumn: ''
    };
    onChange({ ...config, joins: [...config.joins, newJoin] });
  };

  const updateJoin = (joinId: string, updates: Partial<QueryJoin>) => {
    const newJoins = config.joins.map(join => 
      join.id === joinId ? { ...join, ...updates } : join
    );
    onChange({ ...config, joins: newJoins });
  };

  const removeJoin = (joinId: string) => {
    const newJoins = config.joins.filter(join => join.id !== joinId);
    onChange({ ...config, joins: newJoins });
  };

  // Condition management functions
  const addCondition = () => {
    const newCondition: QueryCondition = {
      id: `condition_${Date.now()}`,
      column: '',
      operator: '=',
      value: '',
      logicalOperator: config.conditions.length > 0 ? 'AND' : undefined
    };
    onChange({ ...config, conditions: [...config.conditions, newCondition] });
  };

  const updateCondition = (conditionId: string, updates: Partial<QueryCondition>) => {
    const newConditions = config.conditions.map(condition => 
      condition.id === conditionId ? { ...condition, ...updates } : condition
    );
    onChange({ ...config, conditions: newConditions });
  };

  const removeCondition = (conditionId: string) => {
    const newConditions = config.conditions.filter(condition => condition.id !== conditionId);
    onChange({ ...config, conditions: newConditions });
  };

  // Helper function to get columns for a specific table
  const getColumnsForTable = (tableName: string) => {
    return availableColumns
      .filter(col => col.table === tableName)
      .map(col => ({
        name: col.value.split('.')[1] || col.value,
        fullName: col.value
      }))
      .filter(col => col.name && col.name.trim() !== '');
  };

  return (
    <div className="space-y-6">
      {/* Query Validation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Query Status</CardTitle>
            <div className="flex items-center space-x-2">
              {validation.isValid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <Badge variant={validation.isValid ? "secondary" : "destructive"}>
                {validation.isValid ? "Valid" : "Invalid"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        {validation.errors.length > 0 && (
          <CardContent>
            <div className="space-y-1">
              {validation.errors.map((error, index) => (
                <p key={index} className="text-sm text-red-600">• {error}</p>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Joins Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Joins</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {config.joins.map((join) => (
              <div key={join.id} className="p-3 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Select value={join.type} onValueChange={(value: any) => updateJoin(join.id, { type: value })}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INNER">INNER</SelectItem>
                      <SelectItem value="LEFT">LEFT</SelectItem>
                      <SelectItem value="RIGHT">RIGHT</SelectItem>
                      <SelectItem value="FULL">FULL</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeJoin(join.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-600">Left Table</Label>
                    <Select value={join.leftTable} onValueChange={(value) => updateJoin(join.id, { leftTable: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select table" />
                      </SelectTrigger>
                      <SelectContent>
                        {allTables.map(table => (
                          <SelectItem key={table} value={table}>{table}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Right Table</Label>
                    <Select value={join.rightTable} onValueChange={(value) => updateJoin(join.id, { rightTable: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select table" />
                      </SelectTrigger>
                      <SelectContent>
                        {allTables.map(table => (
                          <SelectItem key={table} value={table}>{table}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-600">Left Column</Label>
                    <Select value={join.leftColumn} onValueChange={(value) => updateJoin(join.id, { leftColumn: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {getColumnsForTable(join.leftTable).map((col, index) => (
                          <SelectItem key={`left-${join.leftTable}-${col.name}-${index}`} value={col.name}>
                            {col.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Right Column</Label>
                    <Select value={join.rightColumn} onValueChange={(value) => updateJoin(join.id, { rightColumn: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {getColumnsForTable(join.rightTable).map((col, index) => (
                          <SelectItem key={`right-${join.rightTable}-${col.name}-${index}`} value={col.name}>
                            {col.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {config.selectedTables.length < 2 ? (
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 mb-2">
                To create joins, first drag at least 2 tables from the left sidebar to the query canvas.
              </p>
              <p className="text-xs text-blue-500">
                Drag tables → Configure joins → Execute query
              </p>
            </div>
          ) : (
            <Button 
              onClick={addJoin}
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Join
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Conditions & Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Conditions & Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {config.conditions.map((condition) => (
              <div key={condition.id} className="p-3 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  {condition.logicalOperator && (
                    <Select 
                      value={condition.logicalOperator} 
                      onValueChange={(value: 'AND' | 'OR') => updateCondition(condition.id, { logicalOperator: value })}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeCondition(condition.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-gray-600">Column</Label>
                    <Select value={condition.column} onValueChange={(value) => updateCondition(condition.id, { column: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map(col => (
                          <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Operator</Label>
                    <Select value={condition.operator} onValueChange={(value) => updateCondition(condition.id, { operator: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SQL_OPERATORS.map(op => (
                          <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Value</Label>
                    <Input
                      value={condition.value}
                      onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                      placeholder="Enter value"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <Button 
            onClick={addCondition}
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Condition
          </Button>
        </CardContent>
      </Card>

      {/* Group By */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Group By</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {config.groupBy.map((column) => (
              <Badge key={column} variant="secondary" className="flex items-center space-x-1">
                <span>{column}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFromGroupBy(column)}
                  className="h-4 w-4 p-0 text-gray-400 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
          
          <Select value="" onValueChange={addToGroupBy}>
            <SelectTrigger>
              <SelectValue placeholder="Add column to group by..." />
            </SelectTrigger>
            <SelectContent>
              {isLoadingColumns ? (
                <div className="px-4 py-2 text-sm text-gray-500">Loading columns...</div>
              ) : availableColumns.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-500">No columns available for selected tables.</div>
              ) : (
                Array.from(new Set(availableColumns.map(col => col.table))).map(tableName => (
                  <SelectGroup key={tableName}>
                    <SelectLabel>{tableName}</SelectLabel>
                    {errorTables.includes(tableName) ? (
                      <div className="px-4 py-2 text-xs text-red-500">Failed to load columns</div>
                    ) : availableColumns
                        .filter(col => col.table === tableName && !config.groupBy.includes(col.value))
                        .length === 0 ? (
                      <div className="px-4 py-2 text-xs text-gray-400">No columns available</div>
                    ) : (
                      availableColumns
                        .filter(col => col.table === tableName && !config.groupBy.includes(col.value))
                        .map(col => (
                          <SelectItem key={col.value} value={col.value}>{col.label.split('.').pop()}</SelectItem>
                        ))
                    )}
                  </SelectGroup>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Order By */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Order By</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {config.orderBy.map((orderItem, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Select 
                  value={orderItem.column} 
                  onValueChange={(value) => {
                    const newOrderBy = [...config.orderBy];
                    newOrderBy[index] = { ...orderItem, column: value };
                    onChange({ ...config, orderBy: newOrderBy });
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map(col => (
                      <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={orderItem.direction} 
                  onValueChange={(value: 'ASC' | 'DESC') => {
                    const newOrderBy = [...config.orderBy];
                    newOrderBy[index] = { ...orderItem, direction: value };
                    onChange({ ...config, orderBy: newOrderBy });
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASC">ASC</SelectItem>
                    <SelectItem value="DESC">DESC</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newOrderBy = config.orderBy.filter((_, i) => i !== index);
                    onChange({ ...config, orderBy: newOrderBy });
                  }}
                  className="text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          
          <Button 
            onClick={() => {
              const newOrderBy = [...config.orderBy, { column: '', direction: 'ASC' as const }];
              onChange({ ...config, orderBy: newOrderBy });
            }}
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Sort
          </Button>
        </CardContent>
      </Card>

      {/* Advanced Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Advanced Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="distinct"
              checked={config.distinct}
              onCheckedChange={(checked) => onChange({ ...config, distinct: !!checked })}
            />
            <Label htmlFor="distinct" className="text-sm">SELECT DISTINCT</Label>
          </div>
          
          <div>
            <Label className="text-sm text-gray-600">Limit Results</Label>
            <Input
              type="number"
              value={config.limit || ''}
              onChange={(e) => {
                const limit = e.target.value ? parseInt(e.target.value) : undefined;
                onChange({ ...config, limit });
              }}
              placeholder="Enter limit (optional)"
              min="1"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}