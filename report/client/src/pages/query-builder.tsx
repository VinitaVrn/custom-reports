import { useState, useEffect, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Save, History, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DatabaseSchema } from "@/components/database-schema";
import { QueryCanvas } from "@/components/query-canvas";
import { QueryResults } from "@/components/query-results";
import { QueryConfiguration } from "@/components/query-configuration";
import { SubqueryBuilder } from "@/components/subquery-builder";
import { DatabaseConnection } from "@/components/database-connection";
import { SQLGenerator } from "@/lib/sql-generator";
import { apiRequest } from "@/lib/queryClient";
import type { QueryConfig, QueryResult } from "@/types/query";
import { fetchTables, fetchAggregatedData } from "@/lib/api";
import React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { alias } from "drizzle-orm/mysql-core";

export default function QueryBuilder() {
  const [queryConfig, setQueryConfig] = useState<QueryConfig>({
    selectedTables: [],
    selectedColumns: [],
    conditions: [],
    joins: [],
    groupBy: [],
    orderBy: [],
    distinct: false,
    logicalOperator: "AND",
  });

  const [generatedSQL, setGeneratedSQL] = useState("");
  const [queryResults, setQueryResults] = useState<QueryResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [resultsPage, setResultsPage] = useState(1);

  // Fetch available tables for subquery builder
  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["remote/tables"],
    queryFn: fetchTables,
    staleTime: Infinity,
  });

  // Update SQL when config changes
  useEffect(() => {
    if (queryConfig.selectedTables.length > 0) {
      const sql = SQLGenerator.generateSQL(queryConfig);
      setGeneratedSQL(sql);
    } else {
      setGeneratedSQL("");
    }
  }, [queryConfig]);

  // Handle adding multiple tables to query
  const handleTablesAdd = (tableItems: { schema: string; table: string }[]) => {
    const tableNames = tableItems.map((t) => t.table);
    setQueryConfig((prev): QueryConfig => {
      const newTables = tableItems.map((t) => ({
        tableName: t.table,
        schema: t.schema,
        alias: "",
      }));
      const combinedTables = [...prev.selectedTables, ...newTables];
      const uniqueTableMap = new Map<
        string,
        { tableName: string; schema: string; alias: string }
      >();
      for (const table of combinedTables) {
        const key = `${table.schema}.${table.tableName}`;
        uniqueTableMap.set(key, {
          tableName: table.tableName,
          schema: table.schema,
          alias: table.alias ?? "",
        });
      }
      return {
        ...prev,
        selectedTables: Array.from(uniqueTableMap.values()),
      };
    });

    toast({
      title: "Tables Added",
      description: `Added ${tableNames.length} table${
        tableNames.length > 1 ? "s" : ""
      } to query: ${tableNames.join(", ")}`,
    });
  };

  // Handle adding selected columns
  const handleColumnsAdd = (
    columns: { schema: string; table: string; columnName: string }[]
  ) => {
    setQueryConfig((prev): QueryConfig => {
      // Add tables if not already present
      const newTables = [...prev.selectedTables];
      columns.forEach((col) => {
        const exists = newTables.some(
          (t) => t.tableName === col.table && t.schema === col.schema
        );
        if (!exists) {
          newTables.push({
            tableName: col.table,
            schema: col.schema,
            alias: "",
          });
        }
      });
      // Add columns if not already present
      const newColumns = [...prev.selectedColumns];
      columns.forEach((col) => {
        const id = `${col.schema}.${col.table}.${col.columnName}`;
        if (!newColumns.find((c) => c.id === id)) {
          newColumns.push({
            id,
            schema: col.schema,
            tableName: col.table,
            columnName: col.columnName,
          });
        }
      });
      return {
        ...prev,
        selectedTables: newTables,
        selectedColumns: newColumns,
      };
    });
    toast({
      title: "Columns Added",
      description: `Added ${columns.length} column${
        columns.length > 1 ? "s" : ""
      } to query.`,
    });
  };

  const getTableAlias = (schema: string, table: string): string => {
    const match = queryConfig.selectedTables.find(
      (t) => t.schema === schema && t.tableName === table
    );
    return match?.alias?.trim() || `${schema}.${table}`;
  };

  const executeQueryMutation = useMutation({
    mutationFn: async (page: number) => {
      const columns = queryConfig.selectedColumns
        .filter((col) => !col.function)
        .map((col) => {
          const aliasOrTable = getTableAlias(col.schema, col.tableName);
          const columnRef = `${aliasOrTable}.${col.columnName}`;
          return col.alias?.trim()
            ? { column: columnRef, alias: col.alias.trim() }
            : columnRef;
        });
      const joins = queryConfig.joins.map((join) => {
        // Parse fully qualified table strings into schema and tableName
        const [leftSchema, leftTable] = join.leftTable.split(".");
        const [rightSchema, rightTable] = join.rightTable.split(".");

        const rightAlias = getTableAlias(rightSchema, rightTable);
        const leftAlias = getTableAlias(leftSchema, leftTable);
        return {
          schema: rightSchema || "public",
          table: rightTable,
          alias:
            queryConfig.selectedTables
              .find(
                (t) => t.schema === rightSchema && t.tableName === rightTable
              )
              ?.alias?.trim() || undefined,
          type: join.type,
          on: [
            [
              `${leftAlias}.${join.leftColumn}`,
              `${rightAlias}.${join.rightColumn}`,
            ],
            ...(join.additionalConditions || []).map((cond) => [
              `${leftAlias}.${cond.leftColumn}`,
              `${rightAlias}.${cond.rightColumn}`,
            ]),
          ],
        };
      });

      const aggregations = queryConfig.selectedColumns
        .filter((col) => !!col.function)
        .map((col) => ({
          operation: col.function as string,
          column: `${getTableAlias(col.schema, col.tableName)}.${
            col.columnName
          }`,
          alias: col.alias || col.columnName,
        }));

      const group_by = queryConfig.groupBy.map((colPath) => {
        const [schema, table, column] = colPath.split(".");
        const alias = getTableAlias(schema, table);
        const fullCol = `${alias}.${column}`;
        const matching = queryConfig.selectedColumns.find(
          (c) => `${c.schema}.${c.tableName}.${c.columnName}` === colPath
        );

        return matching?.alias
          ? { column: fullCol, alias: matching.alias }
          : fullCol;
      });

      const filters = queryConfig.conditions.map((cond) => {
        const [schema, table, column] = cond.column.split(".");
        const alias = getTableAlias(schema, table);
        return {
          column: `${alias}.${column}`,
          op: cond.operator,
          value: cond.value,
        };
      });

      const order_by = queryConfig.orderBy.map((order) => {
        const [schema, table, column] = order.column.split(".");
        const alias = getTableAlias(schema, table);
        const fullCol = `${alias}.${column}`;
        const matching = queryConfig.selectedColumns.find(
          (col) =>
            `${col.schema}.${col.tableName}.${col.columnName}` === order.column
        );

        const base = {
          column: fullCol,
          dir: order.direction.toLowerCase(),
        };

        return matching?.alias ? { ...base, alias: matching.alias } : base;
      });

      const payload = {
        schema: queryConfig.selectedTables[0].schema,
        table: queryConfig.selectedTables[0].tableName,
        base_alias: queryConfig.selectedTables[0].alias?.trim() || undefined,
        columns,
        joins,
        aggregations,
        group_by: group_by,
        filters: {
          logical_op: queryConfig.logicalOperator,
          conditions: filters,
        },
        order_by: order_by,
        page,
      };
      console.log("Payload, for /get-data:", payload);
      const response = await fetchAggregatedData(payload);
      console.log("Response from /get-data:", response);
      // Transform the response to match QueryResult interface
      const transformedResult: QueryResult = {
        columns: Object.keys(response[0] || {}),
        rows: response.map((row: any) => Object.values(row)),
      };
      return transformedResult;
    },
    onSuccess: (data: QueryResult) => {
      setQueryResults(data);
      console.log("Query Results:", data);

      setShowResultsDialog(true);
      toast({
        title: "Query Executed",
        description: `Retrieved ${data.rows.length} rows`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Query Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveQueryMutation = useMutation({
    mutationFn: async (queryData: { name: string; description?: string }) => {
      const response = await apiRequest("POST", "/api/queries", {
        name: queryData.name,
        description: queryData.description,
        queryConfig: JSON.stringify(queryConfig),
        generatedSql: generatedSQL,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Query Saved",
        description: "Your query has been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/queries"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExecuteQuery = () => {
    if (!generatedSQL.trim()) {
      toast({
        title: "No Query",
        description: "Please build a query first",
        variant: "destructive",
      });
      return;
    }

    const validation = SQLGenerator.validateSQL(generatedSQL);
    if (!validation.isValid) {
      toast({
        title: "Invalid Query",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    setResultsPage(1);
    executeQueryMutation.mutate(1);
  };

  const handleSaveQuery = () => {
    if (!generatedSQL.trim()) {
      toast({
        title: "No Query",
        description: "Please build a query first",
        variant: "destructive",
      });
      return;
    }

    const name = prompt("Enter query name:");
    if (name) {
      const description = prompt("Enter query description (optional):");
      saveQueryMutation.mutate({ name, description: description || undefined });
    }
  };

  const handlePageChange = (page: number) => {
    setResultsPage(page);
    executeQueryMutation.mutate(page);
  };

  const handleCopySQL = async () => {
    if (!generatedSQL.trim()) {
      toast({
        title: "No SQL to Copy",
        description: "Please build a query first",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedSQL);
      toast({
        title: "SQL Copied",
        description: "SQL query copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Error",
        description: "Failed to copy SQL to clipboard",
        variant: "destructive",
      });
    }
  };

  const validation = SQLGenerator.validateSQL(generatedSQL);

  const isNumeric = (type: string) =>
    [
      "integer",
      "float",
      "double",
      "numeric",
      "decimal",
      "real",
      "smallint",
      "bigint",
    ].includes(type);

  useEffect(() => {
    if (queryResults && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [queryResults]);

  return (
    <DndProvider backend={HTML5Backend}>
      <>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-semibold text-gray-800">
                    Visual Query Builder
                  </h1>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                  >
                    PostgreSQL
                  </Badge>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveQuery}
                    disabled={saveQueryMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Query
                  </Button>
                  <Button variant="ghost" size="sm">
                    <History className="h-4 w-4 mr-2" />
                    History
                  </Button>
                  <Button
                    onClick={handleExecuteQuery}
                    disabled={
                      executeQueryMutation.isPending || !generatedSQL.trim()
                    }
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Execute Query
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <div className="flex h-[calc(100vh-73px)]">
            {/* Left Sidebar - Database Schema and Connection */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200 hidden">
                <DatabaseConnection
                  onConnectionChange={(connected) => {
                    // Refresh schema when connection changes
                    if (connected) {
                      // Force refresh of tables data
                      window.location.reload();
                    }
                  }}
                />
              </div>

              <div className="flex flex-col h-full">
                <div className="flex-1 min-h-0 overflow-auto [scrollbar-width:none]">
                  <DatabaseSchema
                    onTablesAdd={handleTablesAdd}
                    onColumnsAdd={handleColumnsAdd}
                  />
                </div>
              </div>
            </div>

            {/* Main Query Builder Area */}
            <div className="flex-1 flex flex-col">
              {/* Query Builder Canvas */}
              <QueryCanvas config={queryConfig} onChange={setQueryConfig} />

              {/* Generated SQL Preview */}
              <div className="border-t border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Generated SQL Preview
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopySQL}
                    disabled={!generatedSQL.trim()}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy SQL
                  </Button>
                </div>
                <div className="bg-gray-800 text-green-400 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {generatedSQL ||
                      "-- Build your query using the drag and drop interface above"}
                  </pre>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Query Configuration */}
            <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
              <div className="p-4">
                <SubqueryBuilder
                  config={queryConfig}
                  onChange={setQueryConfig}
                  availableTables={tables}
                />
                <QueryConfiguration
                  config={queryConfig}
                  onChange={setQueryConfig}
                  validation={validation}
                />
                <Select
                  value={queryConfig.logicalOperator}
                  onValueChange={(value) =>
                    setQueryConfig({
                      ...queryConfig,
                      logicalOperator: value as "AND" | "OR",
                    })
                  }
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        {/* Results Section in Dialog */}
        <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
          <DialogContent className="max-w-5xl w-full h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-2xl">Query Results</DialogTitle>
            </DialogHeader>
            <QueryResults
              results={queryResults}
              isLoading={executeQueryMutation.isPending}
              sql={generatedSQL}
              rowsPerPage={20}
              page={resultsPage}
              onPageChange={handlePageChange}
              canFetchMore={
                queryResults ? queryResults.rows.length === 20 : false
              }
            />
          </DialogContent>
        </Dialog>
      </>
    </DndProvider>
  );
}
