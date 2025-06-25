export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey?: string;
}

export interface Table {
  name: string;
  rowCount: number;
  columns?: Column[];
  expanded?: boolean;
}

export interface SelectedColumn {
  id: string;
  tableName: string;
  columnName: string;
  alias?: string;
  function?: string;
  functionParams?: string[];
}

export interface QueryCondition {
  id: string;
  column: string;
  operator: string;
  value: string;
  logicalOperator?: 'AND' | 'OR';
}

export interface QueryJoin {
  id: string;
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'OUTER';
  leftTable: string;
  leftColumn: string;
  rightTable: string;
  rightColumn: string;
  additionalConditions?: Array<{
    id: string;
    leftColumn: string;
    rightColumn: string;
  }>;
}

export interface QueryConfig {
  selectedTables: string[];
  selectedColumns: SelectedColumn[];
  conditions: QueryCondition[];
  joins: QueryJoin[];
  groupBy: string[];
  orderBy: Array<{ column: string; direction: 'ASC' | 'DESC' }>;
  limit?: number;
  distinct: boolean;
  logicalOperator?: 'AND' | 'OR';
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
}

export interface SavedQuery {
  id: number;
  name: string;
  description?: string;
  queryConfig: string;
  generatedSql: string;
  createdAt: string;
}

export const SQL_FUNCTIONS = [
  { name: 'COUNT', params: ['*', 'column'], description: 'Count rows or non-null values' },
  { name: 'SUM', params: ['column'], description: 'Sum numeric values' },
  { name: 'AVG', params: ['column'], description: 'Average of numeric values' },
  { name: 'MIN', params: ['column'], description: 'Minimum value' },
  { name: 'MAX', params: ['column'], description: 'Maximum value' },
  { name: 'DATE_TRUNC', params: ['precision', 'column'], description: 'Truncate date to precision' },
  { name: 'EXTRACT', params: ['part', 'column'], description: 'Extract part from date' },
  { name: 'UPPER', params: ['column'], description: 'Convert to uppercase' },
  { name: 'LOWER', params: ['column'], description: 'Convert to lowercase' },
  { name: 'LENGTH', params: ['column'], description: 'String length' },
];

export const SQL_OPERATORS = [
  '=', '!=', '<>', '<', '>', '<=', '>=', 
  'LIKE', 'ILIKE', 'NOT LIKE', 'NOT ILIKE',
  'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL',
  'BETWEEN', 'NOT BETWEEN'
];
