import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertSavedQuerySchema } from "@shared/schema";

const executeQuerySchema = z.object({
  sql: z.string().min(1, "SQL query is required"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get database schema (tables)
  app.get("/api/schema/tables", async (req, res) => {
    try {
      const tables = await storage.getTables();
      res.json(tables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      res.status(500).json({ 
        message: "Failed to fetch database tables",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get table columns
  app.get("/api/schema/tables/:tableName/columns", async (req, res) => {
    try {
      const { tableName } = req.params;
      const columns = await storage.getTableColumns(tableName);
      res.json(columns);
    } catch (error) {
      console.error(`Error fetching columns for table ${req.params.tableName}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch table columns",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Execute query
  app.post("/api/query/execute", async (req, res) => {
    try {
      const { sql } = executeQuerySchema.parse(req.body);
      
      // Basic SQL validation to prevent destructive operations
      const normalizedSql = sql.trim().toLowerCase();
      if (normalizedSql.startsWith('drop') || 
          normalizedSql.startsWith('delete') || 
          normalizedSql.startsWith('update') || 
          normalizedSql.startsWith('insert') ||
          normalizedSql.startsWith('alter') ||
          normalizedSql.startsWith('create')) {
        return res.status(400).json({ 
          message: "Only SELECT queries are allowed for security reasons" 
        });
      }

      const result = await storage.executeQuery(sql);
      res.json(result);
    } catch (error) {
      console.error("Error executing query:", error);
      res.status(400).json({ 
        message: "Query execution failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get saved queries
  app.get("/api/queries", async (req, res) => {
    try {
      const queries = await storage.getSavedQueries();
      res.json(queries);
    } catch (error) {
      console.error("Error fetching saved queries:", error);
      res.status(500).json({ 
        message: "Failed to fetch saved queries",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Save query
  app.post("/api/queries", async (req, res) => {
    try {
      const queryData = insertSavedQuerySchema.parse(req.body);
      const savedQuery = await storage.createSavedQuery(queryData);
      res.status(201).json(savedQuery);
    } catch (error) {
      console.error("Error saving query:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid query data",
          errors: error.errors
        });
      } else {
        res.status(500).json({ 
          message: "Failed to save query",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // Get specific saved query
  app.get("/api/queries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const query = await storage.getSavedQuery(id);
      if (!query) {
        return res.status(404).json({ message: "Query not found" });
      }
      res.json(query);
    } catch (error) {
      console.error("Error fetching saved query:", error);
      res.status(500).json({ 
        message: "Failed to fetch saved query",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Delete saved query
  app.delete("/api/queries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSavedQuery(id);
      if (!deleted) {
        return res.status(404).json({ message: "Query not found" });
      }
      res.json({ message: "Query deleted successfully" });
    } catch (error) {
      console.error("Error deleting saved query:", error);
      res.status(500).json({ 
        message: "Failed to delete query",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Export results as CSV
  app.post("/api/query/export", async (req, res) => {
    try {
      const { sql } = executeQuerySchema.parse(req.body);
      
      const normalizedSql = sql.trim().toLowerCase();
      if (!normalizedSql.startsWith('select')) {
        return res.status(400).json({ 
          message: "Only SELECT queries are allowed for export" 
        });
      }

      const result = await storage.executeQuery(sql);
      
      // Convert to CSV
      let csv = result.columns.join(',') + '\n';
      result.rows.forEach(row => {
        csv += row.map((cell: any) => 
          typeof cell === 'string' && cell.includes(',') 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="query_results.csv"');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting query:", error);
      res.status(400).json({ 
        message: "Export failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // External database configuration
  app.post("/api/database/test", async (req, res) => {
    try {
      const config = req.body;
      const { externalDbManager } = await import('./external-db');
      const result = await externalDbManager.testConnection(config);
      res.json(result);
    } catch (error: any) {
      console.error("Database test error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/database/connect", async (req, res) => {
    try {
      const config = req.body;
      const { externalDbManager } = await import('./external-db');
      
      // Test connection first
      const testResult = await externalDbManager.testConnection(config);
      if (!testResult.success) {
        return res.status(400).json(testResult);
      }

      // Set configuration and switch storage to external DB
      externalDbManager.setConfiguration(config);
      storage.setExternalDatabase(true);
      
      res.json({ success: true, message: "Connected to external database" });
    } catch (error: any) {
      console.error("Database connection error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/database/disconnect", async (req, res) => {
    try {
      const { externalDbManager } = await import('./external-db');
      externalDbManager.clearConfiguration();
      storage.setExternalDatabase(false);
      res.json({ success: true, message: "Disconnected from external database" });
    } catch (error: any) {
      console.error("Database disconnection error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/database/status", async (req, res) => {
    try {
      const { externalDbManager } = await import('./external-db');
      const isConnected = externalDbManager.isExternalDatabaseConfigured();
      res.json({ connected: isConnected });
    } catch (error: any) {
      console.error("Database status error:", error);
      res.status(500).json({ connected: false, error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
