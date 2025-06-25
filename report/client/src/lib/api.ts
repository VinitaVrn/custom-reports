// Define the API base URL as a constant
const API_BASE_URL = "https://api-report-builder.honebi.online/";

// Fetches the list of tables from the remote API
export async function fetchTables(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}schemas/tables`);
  if (!response.ok) {
    throw new Error('Failed to fetch tables');
  }
  const data = await response.json();
  return data.public || [];
}

// Fetches columns for a given table from the remote API
export async function fetchTableColumns(schema: string, table: string): Promise<{ column_name: string; data_type: string }[]> {
  const response = await fetch(`${API_BASE_URL}table/columns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ schema, table }),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch columns');
  }
  return await response.json();
}

export const fetchSQLFunctions = async (): Promise<string[]> => {
  const response = await fetch(`${API_BASE_URL}list-functions`);
  if (!response.ok) {
    throw new Error('Failed to fetch SQL functions');
  }
  return response.json();
};

interface Aggregation {
  operation: string;
  column: string;
  alias: string;
}

interface GetDataPayload {
  schema: string;
  table: string;
  aggregations: Aggregation[];
}

export async function fetchAggregatedData(payload: GetDataPayload): Promise<any> {
  const response = await fetch(`${API_BASE_URL}get-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch aggregated data');
  }

  return response.json();
} 