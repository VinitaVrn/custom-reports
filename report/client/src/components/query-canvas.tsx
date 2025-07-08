import { useState, useEffect } from "react";
import { Plus, X, GripVertical, Link, Loader2 } from "lucide-react";
import { DroppableZone } from "./droppable-zone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import type {
  QueryConfig,
  SelectedColumn,
  QueryCondition,
  QueryJoin,
} from "@/types/query";
import { SQL_OPERATORS } from "@/types/query";
import { useQuery } from "@tanstack/react-query";
import { fetchSQLFunctions, fetchTableColumns } from "@/lib/api";

interface QueryCanvasProps {
  config: QueryConfig;
  onChange: (config: QueryConfig) => void;
}

export function QueryCanvas({ config, onChange }: QueryCanvasProps) {
  const {
    data: sqlFunctions,
    isLoading: isLoadingFunctions,
    isError: isErrorFunctions,
  } = useQuery({
    queryKey: ["sql-functions"],
    queryFn: fetchSQLFunctions,
  });

  // Columns cache for selected tables
  const [columnsCache, setColumnsCache] = useState<
    Record<string, Array<{ column_name: string }>>
  >({});
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);

  useEffect(() => {
    const fetchMissingColumns = async () => {
      setIsLoadingColumns(true);
      // const missingTables = config.selectedTables.filter(table => table && !(table in columnsCache));
      const newCache: Record<string, Array<{ column_name: string }>> = {
        ...columnsCache,
      };
      const missingTables = config.selectedTables.filter(
        ({ schema, tableName }) => {
          const key = `${schema}.${tableName}`;
          return !(key in newCache);
        }
      );
      for (const { schema, tableName } of missingTables) {
        const key = `${schema}.${tableName}`;
        try {
          const columns = await fetchTableColumns(schema, tableName);
          if (Array.isArray(columns) && columns.length > 0) {
            newCache[key] = columns.filter((col: any) =>
              col.column_name?.trim()
            );
          } else {
            newCache[key] = [];
            console.warn(`No columns found for table: ${key}`);
          }
        } catch (error) {
          newCache[key] = [];
          console.error(`Error fetching columns for ${key}:`, error);
        }
      }
      setColumnsCache(newCache);
      setIsLoadingColumns(false);
    };
    if (config.selectedTables.length > 0) {
      fetchMissingColumns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(config.selectedTables)]);

  const handleTableDrop = (item: any) => {
    console.log("QueryCanvas handleTableDrop called with:", item);
    console.log("Current config.selectedTables:", config.selectedTables);

    if (item.type === "table" && item.tableName && item.schema) {
      const currentTables = config.selectedTables || [];
      console.log("Current tables array:", currentTables);
      const exists = currentTables.some(
        (t) => t.tableName === item.tableName && t.schema === item.schema
      );

      if (!exists) {
        const newTables = [
          ...currentTables.map((t) => ({
            ...t,
            alias: t.alias ?? "",
          })),
          { tableName: item.tableName, schema: item.schema, alias: "" },
        ];
        console.log("Creating new tables array:", newTables);
        console.log("Full config being passed to onChange:", {
          ...config,
          selectedTables: newTables,
        });
        onChange({ ...config, selectedTables: newTables });
      } else {
        console.log("Table already exists, not adding");
      }
    }
  };

  const handleColumnDrop = (item: any) => {
    if (item.type === "column") {
      const newColumn: SelectedColumn = {
        id: `${item.schema}.${item.tableName}.${item.column.name}`,
        schema: item.schema,
        tableName: item.tableName,
        columnName: item.column.name,
      };

      const newColumns = [...config.selectedColumns];
      if (!newColumns.find((col) => col.id === newColumn.id)) {
        newColumns.push(newColumn);
        onChange({ ...config, selectedColumns: newColumns });
      }
    }
  };

  const handleConditionDrop = (item: any) => {
    if (item.type === "column") {
      const newCondition: QueryCondition = {
        id: `condition_${Date.now()}`,
        column: `${item.schema}.${item.tableName}.${item.column.name}`,
        operator: "=",
        value: "",
        logicalOperator: config.conditions.length > 0 ? "AND" : undefined,
      };

      const newConditions = [...config.conditions, newCondition];
      onChange({ ...config, conditions: newConditions });
    }
  };

  const removeTable = (tableToRemove: {
    tableName: string;
    schema: string;
  }) => {
    const newTables = config.selectedTables.filter(
      (t) =>
        !(
          t.tableName === tableToRemove.tableName &&
          t.schema === tableToRemove.schema
        )
    );
    onChange({ ...config, selectedTables: newTables });
  };

  const removeColumn = (columnId: string) => {
    const newColumns = config.selectedColumns.filter((c) => c.id !== columnId);
    onChange({ ...config, selectedColumns: newColumns });
  };

  const updateColumn = (columnId: string, updates: Partial<SelectedColumn>) => {
    const newColumns = config.selectedColumns.map((col) =>
      col.id === columnId ? { ...col, ...updates } : col
    );
    onChange({ ...config, selectedColumns: newColumns });
  };

  const updateTable = (
    index: number,
    updates: Partial<{ tableName: string; schema: string; alias?: string }>
  ) => {
    const updatedTables = config.selectedTables.map((table, i) =>
      i === index ? { ...table, ...updates } : table
    );
    onChange({ ...config, selectedTables: updatedTables });
  };

  const removeCondition = (conditionId: string) => {
    const newConditions = config.conditions.filter((c) => c.id !== conditionId);
    onChange({ ...config, conditions: newConditions });
  };

  const updateCondition = (
    conditionId: string,
    updates: Partial<QueryCondition>
  ) => {
    const newConditions = config.conditions.map((cond) =>
      cond.id === conditionId ? { ...cond, ...updates } : cond
    );
    onChange({ ...config, conditions: newConditions });
  };

  const addJoin = () => {
    if (config.selectedTables.length < 2) return;

    const newJoin: QueryJoin = {
      id: `join_${Date.now()}`,
      type: "INNER",
      leftTable: `${config.selectedTables[0].schema}.${config.selectedTables[0].tableName}`,
      leftColumn: "",
      rightTable: `${config.selectedTables[1].schema}.${config.selectedTables[1].tableName}`,
      rightColumn: "",
    };

    const newJoins = [...config.joins, newJoin];
    onChange({ ...config, joins: newJoins });
  };

  const removeJoin = (joinId: string) => {
    const newJoins = config.joins.filter((j) => j.id !== joinId);
    onChange({ ...config, joins: newJoins });
  };

  const updateJoin = (joinId: string, updates: Partial<QueryJoin>) => {
    const newJoins = config.joins.map((join) =>
      join.id === joinId ? { ...join, ...updates } : join
    );
    onChange({ ...config, joins: newJoins });
  };

  const addJoinCondition = (joinId: string) => {
    const newJoins = config.joins.map((join) => {
      if (join.id === joinId) {
        return {
          ...join,
          additionalConditions: [
            ...(join.additionalConditions || []),
            {
              id: `join_condition_${Date.now()}`,
              leftColumn: "",
              rightColumn: "",
            },
          ],
        };
      }
      return join;
    });
    onChange({ ...config, joins: newJoins });
  };

  const removeJoinCondition = (joinId: string, conditionId: string) => {
    const newJoins = config.joins.map((join) => {
      if (join.id === joinId) {
        return {
          ...join,
          additionalConditions: (join.additionalConditions || []).filter(
            (condition) => condition.id !== conditionId
          ),
        };
      }
      return join;
    });
    onChange({ ...config, joins: newJoins });
  };

  const updateJoinCondition = (
    joinId: string,
    conditionId: string,
    updates: { leftColumn?: string; rightColumn?: string }
  ) => {
    const newJoins = config.joins.map((join) => {
      if (join.id === joinId) {
        return {
          ...join,
          additionalConditions: (join.additionalConditions || []).map(
            (condition) =>
              condition.id === conditionId
                ? { ...condition, ...updates }
                : condition
          ),
        };
      }
      return join;
    });
    onChange({ ...config, joins: newJoins });
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto">
        {/* Query Builder Steps */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div
              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                config.selectedTables.length === 0
                  ? "bg-primary text-white"
                  : "bg-green-100 text-green-800"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                  config.selectedTables.length === 0
                    ? "bg-white text-primary"
                    : "bg-green-600 text-white"
                }`}
              >
                1
              </span>
              <span>Select Tables</span>
            </div>
            <div
              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                config.selectedTables.length > 0 &&
                config.selectedColumns.length === 0
                  ? "bg-primary text-white"
                  : config.selectedColumns.length > 0
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                  config.selectedTables.length > 0 &&
                  config.selectedColumns.length === 0
                    ? "bg-white text-primary"
                    : config.selectedColumns.length > 0
                    ? "bg-green-600 text-white"
                    : "bg-gray-400 text-white"
                }`}
              >
                2
              </span>
              <span>Choose Columns</span>
            </div>
            <div
              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                config.selectedColumns.length > 0 &&
                config.conditions.length === 0
                  ? "bg-primary text-white"
                  : config.conditions.length > 0
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                  config.selectedColumns.length > 0 &&
                  config.conditions.length === 0
                    ? "bg-white text-primary"
                    : config.conditions.length > 0
                    ? "bg-green-600 text-white"
                    : "bg-gray-400 text-white"
                }`}
              >
                3
              </span>
              <span>Add Conditions</span>
            </div>
          </div>
        </div>

        {/* Selected Tables Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Selected Tables
          </h3>
          <DroppableZone
            onDrop={handleTableDrop}
            acceptedTypes={["table"]}
            emptyMessage="Drag multiple tables here to create joins between them"
            emptyIcon={<Plus className="h-8 w-8" />}
          >
            <div className="space-y-3">
              {config.selectedTables.map(({ schema, tableName }, index) => {
                const key = `${schema}.${tableName}`;

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-4 w-4 bg-primary rounded flex items-center justify-center">
                        <span className="text-xs text-white font-bold">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">
                          {tableName}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          {index === 0 ? "Main table" : "Joined table"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-2 sm:mt-0 sm:ml-6">
                      <label className="text-sm text-gray-600">Alias:</label>
                      <Input
                        type="text"
                        placeholder="table_alias"
                        value={config.selectedTables[index].alias || ""}
                        onChange={(e) =>
                          updateTable(index, { alias: e.target.value })
                        }
                        className="w-24"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTable({ schema, tableName })}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}

              {config.selectedTables.length === 1 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    💡 Drag another table here to enable JOIN functionality
                  </p>
                </div>
              )}

              {config.selectedTables.length >= 2 &&
                config.joins.length === 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      ✅ Multiple tables selected! Go to the right panel to
                      create joins between them.
                    </p>
                  </div>
                )}
            </div>
          </DroppableZone>
        </div>
        {/* Selected Columns Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Selected Columns
          </h3>
          <DroppableZone
            onDrop={handleColumnDrop}
            acceptedTypes={["column"]}
            emptyMessage="Drag columns here to include them in your query results"
            emptyIcon={
              <div className="h-8 w-8 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                <span className="text-xs">[]</span>
              </div>
            }
          >
            <div className="space-y-3">
              {config.selectedColumns.map((column) => (
                <div
                  key={column.id}
                  className="p-4 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <GripVertical className="h-4 w-4 text-gray-300 cursor-move" />
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-800">
                          {column.tableName}.{column.columnName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">
                          Function:
                        </label>
                        <Select
                          value={column.function || "none"}
                          onValueChange={(value) =>
                            updateColumn(column.id, {
                              function: value === "none" ? undefined : value,
                            })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {isLoadingFunctions ? (
                              <SelectItem value="loading" disabled>
                                <div className="flex items-center">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Loading...
                                </div>
                              </SelectItem>
                            ) : isErrorFunctions ? (
                              <SelectItem value="error" disabled>
                                Error loading functions
                              </SelectItem>
                            ) : (
                              sqlFunctions?.map((func) => (
                                <SelectItem key={func} value={func}>
                                  {func}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">Alias:</label>
                        <Input
                          type="text"
                          placeholder="column_alias"
                          value={column.alias || ""}
                          onChange={(e) =>
                            updateColumn(column.id, { alias: e.target.value })
                          }
                          className="w-24"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeColumn(column.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DroppableZone>
        </div>

        {/* Table Joins Section */}
        {config.selectedTables.length > 1 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Table Joins
              </h3>
              <Button
                onClick={addJoin}
                size="sm"
                variant="outline"
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                <Link className="h-4 w-4 mr-1" />
                Add Join
              </Button>
            </div>
            <div className="space-y-3">
              {config.joins.map((join) => (
                <div
                  key={join.id}
                  className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <Select
                      value={join.leftTable}
                      onValueChange={(value) =>
                        updateJoin(join.id, { leftTable: value })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {config.selectedTables.map((table) => (
                          <SelectItem
                            key={`${table.schema}.${table.tableName}`}
                            value={`${table.schema}.${table.tableName}`}
                          >
                            {table.tableName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* <GripVertical className="h-4 w-4 text-gray-300 cursor-move" /> */}
                    <Select
                      value={join.type}
                      onValueChange={(
                        value: "INNER" | "LEFT" | "RIGHT" | "OUTER"
                      ) => updateJoin(join.id, { type: value })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INNER">INNER</SelectItem>
                        <SelectItem value="LEFT">LEFT</SelectItem>
                        <SelectItem value="RIGHT">RIGHT</SelectItem>
                        <SelectItem value="OUTER">OUTER</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600">JOIN</span>
                    <Select
                      value={join.rightTable}
                      onValueChange={(value) =>
                        updateJoin(join.id, { rightTable: value })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {config.selectedTables.map((table) => (
                          <SelectItem
                            key={`${table.schema}.${table.tableName}`}
                            value={`${table.schema}.${table.tableName}`}
                          >
                            {table.tableName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600">ON</span>
                    {/* Left Table Column Dropdown */}
                    <Select
                      value={join.leftColumn}
                      onValueChange={(value) =>
                        updateJoin(join.id, { leftColumn: value })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder={`${join.leftTable} column`} />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingColumns ? (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            Loading columns...
                          </div>
                        ) : !join.leftTable ||
                          !(
                            columnsCache[join.leftTable] &&
                            columnsCache[join.leftTable].length
                          ) ? (
                          <div className="px-4 py-2 text-xs text-gray-400">
                            No columns available
                          </div>
                        ) : (
                          columnsCache[join.leftTable].map((col) => (
                            <SelectItem
                              key={`${join.leftTable}.${col.column_name}`}
                              value={col.column_name}
                            >
                              {col.column_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600">=</span>
                    {/* Right Table Column Dropdown */}
                    <Select
                      value={join.rightColumn}
                      onValueChange={(value) =>
                        updateJoin(join.id, { rightColumn: value })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue
                          placeholder={`${join.rightTable} column`}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingColumns ? (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            Loading columns...
                          </div>
                        ) : !join.rightTable ||
                          !(
                            columnsCache[join.rightTable] &&
                            columnsCache[join.rightTable].length
                          ) ? (
                          <div className="px-4 py-2 text-xs text-gray-400">
                            No columns available
                          </div>
                        ) : (
                          columnsCache[join.rightTable].map((col) => (
                            <SelectItem
                              key={`${join.rightTable}.${col.column_name}`}
                              value={col.column_name}
                            >
                              {col.column_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeJoin(join.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* ADD ON CONDITIONS  */}
                  {(join.additionalConditions || []).map((condition) => (
                    <div
                      key={condition.id}
                      className="flex m-5 flex-row items-center justify-start gap-3"
                    >
                      <span className="text-sm text-gray-600 font-bold">
                        AND
                      </span>

                      {/* Left Table Column Dropdown */}
                      <Select
                        value={condition.leftColumn}
                        onValueChange={(value) =>
                          updateJoinCondition(join.id, condition.id, {
                            leftColumn: value,
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue
                            placeholder={`${join.leftTable} column`}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingColumns ? (
                            <div className="px-4 py-2 text-sm text-gray-500">
                              Loading columns...
                            </div>
                          ) : !join.leftTable ||
                            !(
                              columnsCache[join.leftTable] &&
                              columnsCache[join.leftTable].length
                            ) ? (
                            <div className="px-4 py-2 text-xs text-gray-400">
                              No columns available
                            </div>
                          ) : (
                            columnsCache[join.leftTable].map((col) => (
                              <SelectItem
                                key={`${join.leftTable}.${col.column_name}`}
                                value={col.column_name}
                              >
                                {col.column_name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>

                      <span className="text-sm text-gray-600">=</span>

                      {/* Right Table Column Dropdown */}
                      <Select
                        value={condition.rightColumn}
                        onValueChange={(value) =>
                          updateJoinCondition(join.id, condition.id, {
                            rightColumn: value,
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue
                            placeholder={`${join.rightTable} column`}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingColumns ? (
                            <div className="px-4 py-2 text-sm text-gray-500">
                              Loading columns...
                            </div>
                          ) : !join.rightTable ||
                            !(
                              columnsCache[join.rightTable] &&
                              columnsCache[join.rightTable].length
                            ) ? (
                            <div className="px-4 py-2 text-xs text-gray-400">
                              No columns available
                            </div>
                          ) : (
                            columnsCache[join.rightTable].map((col) => (
                              <SelectItem
                                key={`${join.rightTable}.${col.column_name}`}
                                value={col.column_name}
                              >
                                {col.column_name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          removeJoinCondition(join.id, condition.id)
                        }
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    size="sm"
                    onClick={() => addJoinCondition(join.id)}
                    className="text-white mt-4"
                    title="Add another join condition"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add ON Condition
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conditions & Filters Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Conditions & Filters
          </h3>
          <DroppableZone
            onDrop={handleConditionDrop}
            acceptedTypes={["column"]}
            emptyMessage="Drag columns here to add filtering conditions"
            emptyIcon={
              <div className="h-8 w-8 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                <span className="text-xs">?</span>
              </div>
            }
          >
            <div className="space-y-3">
              {config.conditions.map((condition, index) => (
                <div key={condition.id}>
                  {index > 0 && (
                    <div className="flex items-center justify-center py-2">
                      <Select
                        value={condition.logicalOperator || "AND"}
                        onValueChange={(value: "AND" | "OR") =>
                          updateCondition(condition.id, {
                            logicalOperator: value,
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
                  )}
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <GripVertical className="h-4 w-4 text-gray-300 cursor-move" />

                      <Select
                        value={condition.column}
                        onValueChange={(value) =>
                          updateCondition(condition.id, { column: value })
                        }
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingColumns ? (
                            <div className="px-4 py-2 text-sm text-gray-500">
                              Loading columns...
                            </div>
                          ) : config.selectedTables.length === 0 ? (
                            <div className="px-4 py-2 text-sm text-gray-500">
                              No tables selected.
                            </div>
                          ) : (
                            config.selectedTables.map(
                              ({ schema, tableName }) => {
                                const key = `${schema}.${tableName}`;
                                return (
                                  <SelectGroup key={key}>
                                    <SelectLabel>{tableName}</SelectLabel>
                                    {(columnsCache[key] || []).length === 0 ? (
                                      <div className="px-4 py-2 text-xs text-gray-400">
                                        No columns available
                                      </div>
                                    ) : (
                                      columnsCache[key].map((col) => (
                                        <SelectItem
                                          key={`${key}.${col.column_name}`}
                                          value={`${key}.${col.column_name}`}
                                        >
                                          {tableName}.{col.column_name}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectGroup>
                                );
                              }
                            )
                          )}
                        </SelectContent>
                      </Select>

                      <Select
                        value={condition.operator}
                        onValueChange={(value) =>
                          updateCondition(condition.id, { operator: value })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SQL_OPERATORS.map((op) => (
                            <SelectItem key={op} value={op}>
                              {op}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="text"
                        value={condition.value}
                        onChange={(e) =>
                          updateCondition(condition.id, {
                            value: e.target.value,
                          })
                        }
                        placeholder="Enter value..."
                        className="flex-1"
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(condition.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DroppableZone>
        </div>
      </div>
    </div>
  );
}
