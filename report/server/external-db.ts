import { pool } from "./db";

export interface ExternalDatabaseConfig {
  type: 'postgresql' | 'mysql';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface DatabaseTable {
  name: string;
  rowCount: number;
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey?: string;
}

class ExternalDatabaseManager {
  private currentConfig: ExternalDatabaseConfig | null = null;
  private isConnected: boolean = false;

  setConfiguration(config: ExternalDatabaseConfig) {
    this.currentConfig = config;
    this.isConnected = false;
  }

  clearConfiguration() {
    this.currentConfig = null;
    this.isConnected = false;
  }

  isExternalDatabaseConfigured(): boolean {
    return this.currentConfig !== null;
  }

  async testConnection(config: ExternalDatabaseConfig): Promise<{ success: boolean; error?: string }> {
    try {
      if (config.type === 'postgresql') {
        const { Pool } = await import('pg');
        const testPool = new Pool({
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.username,
          password: config.password,
          ssl: config.ssl ? { rejectUnauthorized: false } : false,
          connectionTimeoutMillis: 5000,
        });

        const client = await testPool.connect();
        await client.query('SELECT 1');
        client.release();
        await testPool.end();
        
        return { success: true };
      } else {
        return { success: false, error: 'MySQL support not yet implemented' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }

  async getTables(): Promise<DatabaseTable[]> {
    if (!this.currentConfig) {
      throw new Error('No external database configured');
    }

    console.log('[DEBUG] External DB Config:', this.currentConfig);
    if (this.currentConfig.type === 'postgresql') {
      const { Pool } = await import('pg');
      const extPool = new Pool({
        host: this.currentConfig.host,
        port: this.currentConfig.port,
        database: this.currentConfig.database,
        user: this.currentConfig.username,
        password: this.currentConfig.password,
        ssl: this.currentConfig.ssl ? { rejectUnauthorized: false } : false,
      });

      try {
        const result = await extPool.query(`
          SELECT 
            t.table_name as name,
            COALESCE(s.n_tup_ins, 0) as row_count
          FROM information_schema.tables t
          LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
          WHERE t.table_schema = 'public' 
            AND t.table_type = 'BASE TABLE'
          ORDER BY t.table_name;
        `);

        return result.rows.map((row: any) => ({
          name: row.name,
          rowCount: parseInt(row.row_count) || 0
        }));
      } finally {
        await extPool.end();
      }
    }

    throw new Error(`Unsupported database type: ${this.currentConfig.type}`);
  }

  async getTableColumns(tableName: string): Promise<DatabaseColumn[]> {
    if (!this.currentConfig) {
      throw new Error('No external database configured');
    }

    if (this.currentConfig.type === 'postgresql') {
      const { Pool } = await import('pg');
      const extPool = new Pool({
        host: this.currentConfig.host,
        port: this.currentConfig.port,
        database: this.currentConfig.database,
        user: this.currentConfig.username,
        password: this.currentConfig.password,
        ssl: this.currentConfig.ssl ? { rejectUnauthorized: false } : false,
      });

      try {
        const result = await extPool.query(`
          SELECT 
            c.column_name as name,
            c.data_type as type,
            c.is_nullable = 'YES' as nullable,
            COALESCE(pk.is_primary, false) as primary_key,
            fk.foreign_table as foreign_key
          FROM information_schema.columns c
          LEFT JOIN (
            SELECT kcu.column_name, true as is_primary
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = $1 
              AND tc.constraint_type = 'PRIMARY KEY'
          ) pk ON pk.column_name = c.column_name
          LEFT JOIN (
            SELECT 
              kcu.column_name,
              ccu.table_name as foreign_table
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu 
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = $1 
              AND tc.constraint_type = 'FOREIGN KEY'
          ) fk ON fk.column_name = c.column_name
          WHERE c.table_name = $1
          ORDER BY c.ordinal_position;
        `, [tableName]);

        return result.rows.map((row: any) => ({
          name: row.name,
          type: row.type.toUpperCase(),
          nullable: row.nullable,
          primaryKey: row.primary_key,
          foreignKey: row.foreign_key
        }));
      } finally {
        await extPool.end();
      }
    }

    throw new Error(`Unsupported database type: ${this.currentConfig.type}`);
  }

  async executeQuery(query: string): Promise<{ columns: string[]; rows: any[] }> {
    if (!this.currentConfig) {
      throw new Error('No external database configured');
    }

    if (this.currentConfig.type === 'postgresql') {
      const { Pool } = await import('pg');
      const extPool = new Pool({
        host: this.currentConfig.host,
        port: this.currentConfig.port,
        database: this.currentConfig.database,
        user: this.currentConfig.username,
        password: this.currentConfig.password,
        ssl: this.currentConfig.ssl ? { rejectUnauthorized: false } : false,
      });

      try {
        const result = await extPool.query(query);
        return {
          columns: result.fields ? result.fields.map((f: any) => f.name) : [],
          rows: result.rows || []
        };
      } finally {
        await extPool.end();
      }
    }

    throw new Error(`Unsupported database type: ${this.currentConfig.type}`);
  }
}

export const externalDbManager = new ExternalDatabaseManager();
