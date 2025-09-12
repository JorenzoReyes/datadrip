import { Pool, PoolClient } from 'pg';

// Database configuration interface
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

// Get database configuration from environment variables
function getDatabaseConfig(): DatabaseConfig {
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'datadrip',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };

  // Validate required environment variables
  if (!process.env.DB_HOST && process.env.NODE_ENV === 'production') {
    throw new Error('DB_HOST environment variable is required in production');
  }
  if (!process.env.DB_PASSWORD && process.env.NODE_ENV === 'production') {
    throw new Error('DB_PASSWORD environment variable is required in production');
  }

  return config;
}

// Create database connection pool
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const config = getDatabaseConfig();
    pool = new Pool({
      ...config,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  return pool;
}

// Execute a query with automatic connection management
export async function query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// Execute a query and return a single row
export async function queryOne<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

// Execute a transaction
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

// Close all connections (useful for graceful shutdown)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Database initialization function
export async function initializeDatabase(): Promise<void> {
  try {
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    console.log('Database connected successfully');

    // Create tables if they don't exist
    await createTables();
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Create necessary tables
async function createTables(): Promise<void> {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      role VARCHAR(50) DEFAULT 'user',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIntegrationsTable = `
    CREATE TABLE IF NOT EXISTS integrations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      platform VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      config JSONB NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      last_sync TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIntegrationAuditLogsTable = `
    CREATE TABLE IF NOT EXISTS integration_audit_logs (
      id SERIAL PRIMARY KEY,
      integration_id INTEGER REFERENCES integrations(id) ON DELETE CASCADE,
      action VARCHAR(100) NOT NULL,
      details JSONB,
      user_agent TEXT,
      ip_address INET,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createUserAuditLogsTable = `
    CREATE TABLE IF NOT EXISTS user_audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(100) NOT NULL,
      details JSONB,
      user_agent TEXT,
      ip_address INET,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Execute table creation queries
  await query(createUsersTable);
  await query(createIntegrationsTable);
  await query(createIntegrationAuditLogsTable);
  await query(createUserAuditLogsTable);

  // Create indexes for better performance
  const createIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
    'CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);',
    'CREATE INDEX IF NOT EXISTS idx_integration_audit_logs_integration_id ON integration_audit_logs(integration_id);',
    'CREATE INDEX IF NOT EXISTS idx_user_audit_logs_user_id ON user_audit_logs(user_id);',
  ];

  for (const indexQuery of createIndexes) {
    await query(indexQuery);
  }
}
