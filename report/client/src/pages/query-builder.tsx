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
import { fetchTables, fetchAggregatedData } from '@/lib/api';
import React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";

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
    queryKey: ['remote/tables'],
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
  const handleTablesAdd = (tableNames: string[]) => {
    setQueryConfig((prev) => {
      const combinedTables = [...prev.selectedTables, ...tableNames];
      const uniqueTables = Array.from(new Set(combinedTables));
      return {
        ...prev,
        selectedTables: uniqueTables,
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
  const handleColumnsAdd = (columns: { tableName: string; columnName: string }[]) => {
    setQueryConfig((prev) => {
      // Add tables if not already present
      const newTables = [...prev.selectedTables];
      columns.forEach(col => {
        if (!newTables.includes(col.tableName)) {
          newTables.push(col.tableName);
        }
      });
      // Add columns if not already present
      const newColumns = [...prev.selectedColumns];
      columns.forEach(col => {
        const id = `${col.tableName}.${col.columnName}`;
        if (!newColumns.find(c => c.id === id)) {
          newColumns.push({
            id,
            tableName: col.tableName,
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
      description: `Added ${columns.length} column${columns.length > 1 ? "s" : ""} to query.`
    });
  };

  const executeQueryMutation = useMutation({
    mutationFn: async (page: number) => {
      const columns = queryConfig.selectedColumns
        .filter(col => !col.function)
        .map(col => `${col.columnName}`);
      const joins = queryConfig.joins.map(join => ({
        schema: "public", // or make this dynamic if you support multiple schemas
        table: join.rightTable,
        type: join.type,
        on: [
          [
            `${join.leftTable}.${join.leftColumn}`,
            `${join.rightTable}.${join.rightColumn}`
          ],
          // Additional join conditions if any
          ...((join.additionalConditions || []).map(cond => [
            `${join.leftTable}.${cond.leftColumn}`,
            `${join.rightTable}.${cond.rightColumn}`
          ]))
        ]
      }));
      const aggregations = queryConfig.selectedColumns
        .filter(col => !!col.function)
        .map(col => ({
          operation: col.function as string,
          column: col.columnName,
          alias: col.alias || col.columnName
        }));
      const payload = {
        schema: "public",
        table: queryConfig.selectedTables[0],
        columns,
        joins,
        aggregations,
        group_by: queryConfig.groupBy.map(col => col.split('.').pop()),
        filters: {
          logical_op: queryConfig.logicalOperator,
          conditions: queryConfig.conditions.map(cond => ({
            column: cond.column.split('.').pop(),
            op: cond.operator,
            value: cond.value
          })),
        },
        order_by: queryConfig.orderBy.map(order => ({
          column: order.column.split('.').pop(),
          dir: order.direction.toLowerCase()
        })),
        page,
      };
      console.log('Payload for /get-data:', payload);
      const response = await fetchAggregatedData(payload);
      console.log('Response from /get-data:', response);
      // Transform the response to match QueryResult interface
      const transformedResult: QueryResult = {
        columns: Object.keys(response[0] || {}),
        rows: response.map((row: any) => Object.values(row)) 
      };
      return transformedResult;
    },
    onSuccess: (data: QueryResult) => {
      setQueryResults(data);
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
    ['integer', 'float', 'double', 'numeric', 'decimal', 'real', 'smallint', 'bigint'].includes(type);

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
                <DatabaseSchema onTablesAdd={handleTablesAdd} onColumnsAdd={handleColumnsAdd} />
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
                onValueChange={(value) => setQueryConfig({ ...queryConfig, logicalOperator: value as "AND" | "OR" })}
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
            canFetchMore={queryResults ? queryResults.rows.length === 20 : false}
          />
        </DialogContent>
      </Dialog>
      </>
    </DndProvider>
  );
}
