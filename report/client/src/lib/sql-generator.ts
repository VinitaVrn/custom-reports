import type { QueryConfig, SelectedColumn, QueryCondition, QueryJoin } from '@/types/query';

export class SQLGenerator {
  static generateSQL(config: QueryConfig): string {
    const parts: string[] = [];

    // SELECT clause
    let selectClause = 'SELECT';
    if (config.distinct) {
      selectClause += ' DISTINCT';
    }

    if (config.selectedColumns.length === 0) {
      selectClause += ' *';
    } else {
      const columnsList = config.selectedColumns.map(col => {
        let columnExpr = `${col.tableName}.${col.columnName}`;
        
        // Apply function if specified
        if (col.function) {
          switch (col.function) {
            case 'DATE_TRUNC':
              columnExpr = `DATE_TRUNC('day', ${columnExpr})`;
              break;
            case 'EXTRACT':
              columnExpr = `EXTRACT(year FROM ${columnExpr})`;
              break;
            case 'COUNT':
              columnExpr = col.columnName === '*' ? 'COUNT(*)' : `COUNT(${columnExpr})`;
              break;
            case 'SUM':
            case 'AVG':
            case 'MIN':
            case 'MAX':
            case 'UPPER':
            case 'LOWER':
            case 'LENGTH':
              columnExpr = `${col.function}(${columnExpr})`;
              break;
          }
        }

        // Add alias if specified
        if (col.alias) {
          columnExpr += ` AS ${col.alias}`;
        }

        return columnExpr;
      });
      selectClause += '\n  ' + columnsList.join(',\n  ');
    }
    parts.push(selectClause);

    // FROM clause
    if (config.selectedTables.length > 0) {
      parts.push(`FROM ${config.selectedTables[0]}`);
      
      // Add additional tables as INNER JOINs if no explicit joins are defined
      if (config.selectedTables.length > 1 && config.joins.length === 0) {
        for (let i = 1; i < config.selectedTables.length; i++) {
          parts.push(`CROSS JOIN ${config.selectedTables[i]}`);
        }
      }
    }

    // JOIN clauses
    config.joins.forEach(join => {
      let joinClause = `${join.type} JOIN ${join.rightTable} ON ${join.leftTable}.${join.leftColumn} = ${join.rightTable}.${join.rightColumn}`;
      // Add additional ON conditions if they exist
      if (join.additionalConditions && join.additionalConditions.length > 0) {
        joinClause += join.additionalConditions
          .map(condition => ` AND ${join.leftTable}.${condition.leftColumn} = ${join.rightTable}.${condition.rightColumn}`)
          .join('');
      }
      parts.push(joinClause);
    });

    // WHERE clause
    if (config.conditions.length > 0) {
      const whereConditions = config.conditions.map((condition, index) => {
        let conditionStr = '';
        
        // Add logical operator for conditions after the first one
        if (index > 0 && condition.logicalOperator) {
          conditionStr += `${condition.logicalOperator} `;
        }

        // Build the condition
        let value = condition.value;
        if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
          // Ensure IN values are properly formatted
          if (!value.startsWith('(')) {
            value = `(${value})`;
          }
        } else if (condition.operator === 'LIKE' || condition.operator === 'ILIKE') {
          // Ensure LIKE values are quoted
          if (!value.startsWith("'")) {
            value = `'${value}'`;
          }
        } else if (condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL') {
          value = '';
        } else if (isNaN(Number(value)) && !value.startsWith("'")) {
          // Quote non-numeric values
          value = `'${value}'`;
        }

        conditionStr += `${condition.column} ${condition.operator}`;
        if (value) {
          conditionStr += ` ${value}`;
        }

        return conditionStr;
      });

      parts.push('WHERE ' + whereConditions.join(' '));
    }

    // GROUP BY clause
    if (config.groupBy.length > 0) {
      parts.push('GROUP BY ' + config.groupBy.join(', '));
    }

    // ORDER BY clause
    if (config.orderBy.length > 0) {
      const orderList = config.orderBy
        .filter(order => order.column && order.column.trim() !== '')
        .map(order => `${order.column} ${order.direction}`);
      if (orderList.length > 0) {
        parts.push('ORDER BY ' + orderList.join(', '));
      }
    }

    // LIMIT clause
    if (config.limit && config.limit > 0) {
      parts.push(`LIMIT ${config.limit}`);
    }

    return parts.join('\n');
  }

  static validateSQL(sql: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const normalizedSql = sql.trim().toLowerCase();

    // Basic validation
    if (!normalizedSql.startsWith('select')) {
      errors.push('Query must start with SELECT');
    }

    if (!normalizedSql.includes('from')) {
      errors.push('Query must include FROM clause');
    }

    // Check for balanced parentheses
    const openParens = (sql.match(/\(/g) || []).length;
    const closeParens = (sql.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Unbalanced parentheses in query');
    }

    // Check for dangerous keywords
    const dangerousKeywords = ['drop', 'delete', 'update', 'insert', 'alter', 'create', 'truncate'];
    const hasDangerousKeywords = dangerousKeywords.some(keyword => 
      normalizedSql.includes(keyword)
    );
    if (hasDangerousKeywords) {
      errors.push('Query contains restricted keywords');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
