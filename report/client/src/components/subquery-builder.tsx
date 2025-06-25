import { useState, useEffect } from 'react';
import { Plus, X, ChevronDown, ChevronRight, Database, Edit, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { QueryConfig, SelectedColumn, QueryCondition, QueryJoin } from '@/types/query';
import { SQL_OPERATORS, SQL_FUNCTIONS } from '@/types/query';
import { fetchTableColumns } from '@/lib/api';

interface SubqueryBuilderProps {
  config: QueryConfig;
  onChange: (config: QueryConfig) => void;
  availableTables: string[];
}

interface Subquery {
  id: string;
  name: string;
  config: QueryConfig;
  alias: string;
}

// Full-featured subquery configuration component
function SubqueryConfiguration({ 
  subqueryConfig, 
  onChange, 
  availableTables 
}: { 
  subqueryConfig: QueryConfig; 
  onChange: (config: QueryConfig) => void; 
  availableTables: string[];
}) {
  const [availableColumns, setAvailableColumns] = useState<Array<{ value: string; label: string; table: string }>>([]);

  // Get all tables involved in the subquery
  const allTables = Array.from(new Set([
    ...subqueryConfig.selectedTables,
    ...subqueryConfig.joins.map(join => join.leftTable),
    ...subqueryConfig.joins.map(join => join.rightTable)
  ])).filter(table => table && table.trim());

  useEffect(() => {
    const fetchAllColumns = async () => {
      const allColumns: Array<{ value: string; label: string; table: string }> = [];
      
      for (const tableName of allTables) {
        if (tableName) {
          try {
            const columns = await fetchTableColumns('public', tableName);
            if (Array.isArray(columns)) {
              columns.forEach((column: any) => {
                allColumns.push({
                  value: `${tableName}.${column.name}`,
                  label: `${tableName}.${column.name}`,
                  table: tableName
                });
              });
            }
          } catch (error) {
            console.error(`Error fetching columns for ${tableName}:`, error);
          }
        }
      }
      
      setAvailableColumns(allColumns);
    };

    if (allTables.length > 0) {
      fetchAllColumns();
    } else {
      setAvailableColumns([]);
    }
  }, [allTables.join(',')]);

  // Helper functions for managing subquery config
  const addTable = (tableName: string) => {
    if (!subqueryConfig.selectedTables.includes(tableName)) {
      onChange({ 
        ...subqueryConfig, 
        selectedTables: [...subqueryConfig.selectedTables, tableName] 
      });
    }
  };

  const removeTable = (tableName: string) => {
    onChange({ 
      ...subqueryConfig, 
      selectedTables: subqueryConfig.selectedTables.filter(t => t !== tableName) 
    });
  };

  const addColumn = (column: { tableName: string; columnName: string }) => {
    const newColumn: SelectedColumn = {
      id: `${column.tableName}.${column.columnName}`,
      tableName: column.tableName,
      columnName: column.columnName,
    };
    
    if (!subqueryConfig.selectedColumns.find(col => col.id === newColumn.id)) {
      onChange({ 
        ...subqueryConfig, 
        selectedColumns: [...subqueryConfig.selectedColumns, newColumn] 
      });
    }
  };

  const removeColumn = (columnId: string) => {
    onChange({ 
      ...subqueryConfig, 
      selectedColumns: subqueryConfig.selectedColumns.filter(col => col.id !== columnId) 
    });
  };

  const addJoin = () => {
    const newJoin: QueryJoin = {
      id: `join_${Date.now()}`,
      type: 'INNER',
      leftTable: subqueryConfig.selectedTables[0] || '',
      leftColumn: '',
      rightTable: '',
      rightColumn: ''
    };
    onChange({ ...subqueryConfig, joins: [...subqueryConfig.joins, newJoin] });
  };

  const updateJoin = (joinId: string, updates: Partial<QueryJoin>) => {
    const newJoins = subqueryConfig.joins.map(join => 
      join.id === joinId ? { ...join, ...updates } : join
    );
    onChange({ ...subqueryConfig, joins: newJoins });
  };

  const removeJoin = (joinId: string) => {
    onChange({ 
      ...subqueryConfig, 
      joins: subqueryConfig.joins.filter(join => join.id !== joinId) 
    });
  };

  const addCondition = () => {
    const newCondition: QueryCondition = {
      id: `condition_${Date.now()}`,
      column: '',
      operator: '=',
      value: '',
      logicalOperator: subqueryConfig.conditions.length > 0 ? 'AND' : undefined
    };
    onChange({ ...subqueryConfig, conditions: [...subqueryConfig.conditions, newCondition] });
  };

  const updateCondition = (conditionId: string, updates: Partial<QueryCondition>) => {
    const newConditions = subqueryConfig.conditions.map(condition => 
      condition.id === conditionId ? { ...condition, ...updates } : condition
    );
    onChange({ ...subqueryConfig, conditions: newConditions });
  };

  const removeCondition = (conditionId: string) => {
    onChange({ 
      ...subqueryConfig, 
      conditions: subqueryConfig.conditions.filter(condition => condition.id !== conditionId) 
    });
  };

  const addGroupBy = (column: string) => {
    if (!subqueryConfig.groupBy.includes(column)) {
      onChange({ ...subqueryConfig, groupBy: [...subqueryConfig.groupBy, column] });
    }
  };

  const removeGroupBy = (column: string) => {
    onChange({ 
      ...subqueryConfig, 
      groupBy: subqueryConfig.groupBy.filter(col => col !== column) 
    });
  };

  const addOrderBy = () => {
    onChange({ 
      ...subqueryConfig, 
      orderBy: [...subqueryConfig.orderBy, { column: '', direction: 'ASC' as const }] 
    });
  };

  const updateOrderBy = (index: number, updates: Partial<{ column: string; direction: 'ASC' | 'DESC' }>) => {
    const newOrderBy = subqueryConfig.orderBy.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    );
    onChange({ ...subqueryConfig, orderBy: newOrderBy });
  };

  const removeOrderBy = (index: number) => {
    onChange({ 
      ...subqueryConfig, 
      orderBy: subqueryConfig.orderBy.filter((_, i) => i !== index) 
    });
  };

  return (
    <div className="space-y-6 max-h-[600px] overflow-y-auto">
      {/* Table Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Tables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {subqueryConfig.selectedTables.map((table) => (
              <Badge key={table} variant="secondary" className="flex items-center gap-1">
                {table}
                <button
                  onClick={() => removeTable(table)}
                  className="text-gray-500 hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
          <Select value="" onValueChange={addTable}>
            <SelectTrigger>
              <SelectValue placeholder="Add table..." />
            </SelectTrigger>
            <SelectContent>
              {availableTables.filter(table => !subqueryConfig.selectedTables.includes(table)).map((table) => (
                <SelectItem key={table} value={table}>{table}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Column Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Columns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {subqueryConfig.selectedColumns.map((column) => (
              <div key={column.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">{column.tableName}.{column.columnName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeColumn(column.id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Select value="" onValueChange={(value) => {
            const [tableName, columnName] = value.split('.');
            addColumn({ tableName, columnName });
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Add column..." />
            </SelectTrigger>
            <SelectContent>
              {availableColumns.map((col) => (
                <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* JOIN Builder */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Joins</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {subqueryConfig.joins.map((join) => (
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
                        {availableColumns
                          .filter(col => col.table === join.leftTable)
                          .map(col => {
                            const parts = col.value.split('.');
                            const columnName = parts.length > 1 ? parts[1] : col.value;
                            return columnName && columnName.trim() && columnName !== '' ? (
                              <SelectItem key={`${col.table}-${columnName}`} value={columnName}>
                                {columnName}
                              </SelectItem>
                            ) : null;
                          })
                          .filter(item => item !== null)}
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
                        {availableColumns
                          .filter(col => col.table === join.rightTable)
                          .map(col => {
                            const parts = col.value.split('.');
                            const columnName = parts.length > 1 ? parts[1] : col.value;
                            return columnName && columnName.trim() && columnName !== '' ? (
                              <SelectItem key={`${col.table}-${columnName}`} value={columnName}>
                                {columnName}
                              </SelectItem>
                            ) : null;
                          })
                          .filter(item => item !== null)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <Button 
            onClick={addJoin}
            variant="outline" 
            size="sm" 
            className="w-full"
            disabled={subqueryConfig.selectedTables.length < 2}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Join
          </Button>
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {subqueryConfig.conditions.map((condition, index) => (
              <div key={condition.id} className="p-3 bg-gray-50 rounded-lg space-y-3">
                {index > 0 && (
                  <Select 
                    value={condition.logicalOperator} 
                    onValueChange={(value: any) => updateCondition(condition.id, { logicalOperator: value })}
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
                
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
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
                  <div className="col-span-3">
                    <Label className="text-xs text-gray-600">Operator</Label>
                    <Select value={condition.operator} onValueChange={(value) => updateCondition(condition.id, { operator: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SQL_OPERATORS.map(op => (
                          <SelectItem key={op} value={op}>{op}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs text-gray-600">Value</Label>
                    <Input
                      value={condition.value}
                      onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                      placeholder="Enter value"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeCondition(condition.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
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

      {/* GROUP BY and ORDER BY */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Grouping & Sorting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="block text-sm text-gray-700 mb-2">GROUP BY</Label>
            <div className="space-y-2">
              {subqueryConfig.groupBy.map((column) => (
                <Badge key={column} variant="secondary" className="mr-1 mb-1">
                  {column}
                  <button
                    onClick={() => removeGroupBy(column)}
                    className="ml-1 text-gray-500 hover:text-red-500"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              <Select value="" onValueChange={addGroupBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Add column..." />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns.map((col) => (
                    <SelectItem key={col.value} value={col.value}>
                      {col.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm text-gray-700">ORDER BY</Label>
              <Button
                onClick={addOrderBy}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {subqueryConfig.orderBy.map((order, index) => (
                <div key={index} className="flex space-x-2">
                  <Select
                    value={order.column}
                    onValueChange={(value) => updateOrderBy(index, { column: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((col) => (
                        <SelectItem key={col.value} value={col.value}>
                          {col.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={order.direction}
                    onValueChange={(value: any) => updateOrderBy(index, { direction: value })}
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
                    onClick={() => removeOrderBy(index)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Query Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Query Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="subquery-distinct"
              checked={subqueryConfig.distinct}
              onCheckedChange={(checked) => 
                onChange({ ...subqueryConfig, distinct: !!checked })
              }
            />
            <Label htmlFor="subquery-distinct" className="text-sm text-gray-700">
              SELECT DISTINCT
            </Label>
          </div>
          
          <div>
            <Label htmlFor="subquery-limit" className="block text-sm text-gray-700 mb-1">
              LIMIT Results
            </Label>
            <Input
              id="subquery-limit"
              type="number"
              placeholder="1000"
              value={subqueryConfig.limit || ''}
              onChange={(e) => 
                onChange({ 
                  ...subqueryConfig, 
                  limit: e.target.value ? parseInt(e.target.value) : undefined 
                })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SubqueryBuilder({ config, onChange, availableTables }: SubqueryBuilderProps) {
  const [subqueries, setSubqueries] = useState<Subquery[]>([]);
  const [expandedSubqueries, setExpandedSubqueries] = useState<Set<string>>(new Set());
  const [editingSubquery, setEditingSubquery] = useState<Subquery | null>(null);

  const addSubquery = () => {
    const newSubquery: Subquery = {
      id: `subquery_${Date.now()}`,
      name: `Subquery ${subqueries.length + 1}`,
      alias: `sub${subqueries.length + 1}`,
      config: {
        selectedTables: [],
        selectedColumns: [],
        conditions: [],
        joins: [],
        groupBy: [],
        orderBy: [],
        distinct: false,
      }
    };
    
    setSubqueries([...subqueries, newSubquery]);
    setExpandedSubqueries(new Set([...Array.from(expandedSubqueries), newSubquery.id]));
  };

  const removeSubquery = (subqueryId: string) => {
    setSubqueries(subqueries.filter(sq => sq.id !== subqueryId));
    const expandedArray = Array.from(expandedSubqueries);
    const newExpanded = new Set(expandedArray.filter(id => id !== subqueryId));
    setExpandedSubqueries(newExpanded);
  };

  const updateSubquery = (subqueryId: string, updates: Partial<Subquery>) => {
    setSubqueries(subqueries.map(sq => 
      sq.id === subqueryId ? { ...sq, ...updates } : sq
    ));
  };

  const toggleSubquery = (subqueryId: string) => {
    const expandedArray = Array.from(expandedSubqueries);
    if (expandedArray.includes(subqueryId)) {
      const newExpanded = new Set(expandedArray.filter(id => id !== subqueryId));
      setExpandedSubqueries(newExpanded);
    } else {
      const newExpanded = new Set([...expandedArray, subqueryId]);
      setExpandedSubqueries(newExpanded);
    }
  };

  const addSubqueryToMainQuery = (subquery: Subquery) => {
    // Add subquery as a condition or as a derived table
    const subqueryCondition: QueryCondition = {
      id: `condition_${Date.now()}`,
      column: 'id', // This would be configurable
      operator: 'IN',
      value: `(SELECT id FROM (${generateSubquerySQL(subquery.config)}) ${subquery.alias})`,
      logicalOperator: config.conditions.length > 0 ? 'AND' : undefined,
    };
    
    const newConditions = [...config.conditions, subqueryCondition];
    onChange({ ...config, conditions: newConditions });
  };

  const generateSubquerySQL = (subConfig: QueryConfig): string => {
    let sql = 'SELECT ';
    
    if (subConfig.selectedColumns.length === 0) {
      sql += '*';
    } else {
      sql += subConfig.selectedColumns.map(col => `${col.tableName}.${col.columnName}`).join(', ');
    }
    
    if (subConfig.selectedTables.length > 0) {
      sql += ` FROM ${subConfig.selectedTables[0]}`;
    }
    
    if (subConfig.conditions.length > 0) {
      sql += ' WHERE ' + subConfig.conditions.map(cond => 
        `${cond.column} ${cond.operator} ${cond.value}`
      ).join(' AND ');
    }
    
    return sql;
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Subqueries</h3>
        <Button
          onClick={addSubquery}
          size="sm"
          variant="outline"
          className="text-purple-600 border-purple-300 hover:bg-purple-50"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Subquery
        </Button>
      </div>

      <div className="space-y-4">
        {subqueries.map((subquery) => (
          <div key={subquery.id} className="border border-purple-200 rounded-lg overflow-hidden">
            <Collapsible 
              open={expandedSubqueries.has(subquery.id)}
              onOpenChange={() => toggleSubquery(subquery.id)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <Database className="h-4 w-4 text-purple-600" />
                    <div>
                      <Input
                        value={subquery.name}
                        onChange={(e) => updateSubquery(subquery.id, { name: e.target.value })}
                        className="font-medium bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm text-gray-500">Alias: {subquery.alias}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={(e) => e.stopPropagation()}
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Configure
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh]">
                        <DialogHeader>
                          <DialogTitle>Configure Subquery: {subquery.name}</DialogTitle>
                        </DialogHeader>
                        <SubqueryConfiguration
                          subqueryConfig={subquery.config}
                          onChange={(newConfig) => updateSubquery(subquery.id, { config: newConfig })}
                          availableTables={availableTables}
                        />
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        addSubqueryToMainQuery(subquery);
                      }}
                      size="sm"
                      variant="ghost"
                      className="text-green-600 hover:bg-green-50"
                    >
                      Use in Query
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSubquery(subquery.id);
                      }}
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {expandedSubqueries.has(subquery.id) ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="p-4 bg-white border-t border-purple-200">
                  <div className="space-y-4">
                    {/* Subquery Alias */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subquery Alias
                      </label>
                      <Input
                        value={subquery.alias}
                        onChange={(e) => updateSubquery(subquery.id, { alias: e.target.value })}
                        placeholder="sub1"
                        className="w-32"
                      />
                    </div>

                    {/* Quick Summary */}
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-600 mb-2">Summary:</p>
                      <p className="text-sm">
                        Tables: {subquery.config.selectedTables.length > 0 ? subquery.config.selectedTables.join(', ') : 'None'}
                      </p>
                      <p className="text-sm">
                        Columns: {subquery.config.selectedColumns.length}
                      </p>
                      <p className="text-sm">
                        Joins: {subquery.config.joins.length}
                      </p>
                      <p className="text-sm">
                        Conditions: {subquery.config.conditions.length}
                      </p>
                    </div>

                    {/* Generated Subquery SQL Preview */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Generated SQL Preview
                      </label>
                      <div className="bg-gray-800 text-green-400 p-3 rounded text-sm font-mono">
                        {generateSubquerySQL(subquery.config) || '-- Click Configure to build your subquery'}
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ))}

        {subqueries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No subqueries created yet</p>
            <p className="text-xs">Add a subquery to create complex nested queries</p>
          </div>
        )}
      </div>
    </div>
  );
}