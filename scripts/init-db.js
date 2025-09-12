#!/usr/bin/env node

/**
 * Database initialization script
 * This script initializes the database with required tables and data
 */

// Since we can't easily import TypeScript modules from a JS script,
// we'll create a simple database initialization here
const { Pool } = require('pg');

// Database configuration
function getDatabaseConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'datadrip',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}

// Test database connection
async function testConnection(pool) {
  try {
    await pool.query('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

// Create necessary tables
async function createTables(pool) {
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
  await pool.query(createUsersTable);
  await pool.query(createIntegrationsTable);
  await pool.query(createIntegrationAuditLogsTable);
  await pool.query(createUserAuditLogsTable);

  // Create indexes for better performance
  const createIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
    'CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);',
    'CREATE INDEX IF NOT EXISTS idx_integration_audit_logs_integration_id ON integration_audit_logs(integration_id);',
    'CREATE INDEX IF NOT EXISTS idx_user_audit_logs_user_id ON user_audit_logs(user_id);',
  ];

  for (const indexQuery of createIndexes) {
    await pool.query(indexQuery);
  }
}

// Initialize database
async function initializeDatabase() {
  const config = getDatabaseConfig();
  const pool = new Pool(config);

  try {
    // Test connection first
    const isConnected = await testConnection(pool);
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    console.log('Database connected successfully');

    // Create tables if they don't exist
    await createTables(pool);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('Starting database initialization...');
  
  try {
    await initializeDatabase();
    console.log('✅ Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await closePool();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await closePool();
  process.exit(1);
});

main();

