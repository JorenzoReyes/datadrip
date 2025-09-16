#!/usr/bin/env node

/**
 * Database initialization script
 * This script initializes the database with required tables and data
 * Works with both local PostgreSQL and Docker containers
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

// Database configuration with Docker fallback
function getDatabaseConfig() {
  // Check if we're running in Docker or if Docker PostgreSQL is available
  const isDockerAvailable = checkDockerAvailability();
  const isDockerPostgresRunning = isDockerAvailable && checkDockerPostgresRunning();
  
  if (isDockerPostgresRunning) {
    console.log('🐳 Using Docker PostgreSQL configuration');
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'datadrip',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres', // Docker default password
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  } else {
    console.log('💻 Using local PostgreSQL configuration');
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'datadrip',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }
}

// Check if Docker is available
function checkDockerAvailability() {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if Docker PostgreSQL container is running
function checkDockerPostgresRunning() {
  try {
    const output = execSync('docker ps --filter "name=postgres" --format "{{.Names}}"', { encoding: 'utf8' });
    return output.includes('postgres') || output.includes('datadrip');
  } catch (error) {
    return false;
  }
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
      user_id SERIAL PRIMARY KEY,
      username VARCHAR(30) NOT NULL,
      fname VARCHAR(50) NOT NULL,
      lname VARCHAR(30) NOT NULL,
      email VARCHAR(100) NOT NULL,
      password VARCHAR(20) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Execute table creation queries
  await pool.query(createUsersTable);

  // Create indexes for better performance
  const createIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);',
  ];

  for (const indexQuery of createIndexes) {
    await pool.query(indexQuery);
  }
}

// Initialize database using Docker exec as fallback
async function initializeDatabaseWithDocker() {
  console.log('🔄 Attempting database initialization via Docker...');
  
  try {
    // Create users table
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(30) NOT NULL,
        fname VARCHAR(50) NOT NULL,
        lname VARCHAR(30) NOT NULL,
        email VARCHAR(100) NOT NULL,
        password VARCHAR(20) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${createUsersTable}"`, { stdio: 'inherit' });
    
    // Create indexes
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);',
    ];
    
    for (const indexQuery of createIndexes) {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${indexQuery}"`, { stdio: 'inherit' });
    }
    
    console.log('✅ Database initialized successfully via Docker');
    return true;
  } catch (error) {
    console.error('❌ Docker initialization failed:', error.message);
    return false;
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
      console.log('⚠️  Direct connection failed, trying Docker fallback...');
      const dockerSuccess = await initializeDatabaseWithDocker();
      if (dockerSuccess) {
        return;
      }
      throw new Error('Failed to connect to database via both direct connection and Docker');
    }

    console.log('Database connected successfully');

    // Create tables if they don't exist
    await createTables(pool);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    
    // Try Docker fallback if direct connection failed
    console.log('🔄 Attempting Docker fallback...');
    const dockerSuccess = await initializeDatabaseWithDocker();
    if (!dockerSuccess) {
      throw error;
    }
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

