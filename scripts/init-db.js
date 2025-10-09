#!/usr/bin/env node

/**
 * Database initialization script
 * This script initializes the database with required tables and data
 * Works with both local PostgreSQL and Docker containers
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

// Database configuration with preference for DATABASE_URL; Docker fallback only if no URL
function getDatabaseConfig() {
  // Prefer a single DATABASE_URL when provided (e.g., Railway)
  if (process.env.DATABASE_URL) {
    console.log('🔗 Using DATABASE_URL environment variable');
    return {
      connectionString: process.env.DATABASE_URL,
      // For Railway/tunnel, use SSL but do not reject self-signed certs
      ssl: { rejectUnauthorized: false }
    };
  }

  // Check if we're running with local/Docker Postgres
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
  }

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
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // RBAC tables
  const createRolesTable = `
    CREATE TABLE IF NOT EXISTS roles (
      role_id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createPermissionsTable = `
    CREATE TABLE IF NOT EXISTS permissions (
      permission_id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createRolePermissionsTable = `
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_permission_id SERIAL PRIMARY KEY,
      permission_id INTEGER REFERENCES permissions(permission_id) ON DELETE CASCADE,
      role_id INTEGER REFERENCES roles(role_id) ON DELETE CASCADE,
      permission VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createUserRolesTable = `
    CREATE TABLE IF NOT EXISTS user_roles (
      user_role_id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      role_id INTEGER REFERENCES roles(role_id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Execute table creation queries (order matters for FKs)
  await pool.query(createUsersTable);
  await pool.query(createRolesTable);
  await pool.query(createPermissionsTable);
  await pool.query(createRolePermissionsTable);
  await pool.query(createUserRolesTable);

  // Create indexes for better performance
  const createIndexes = [
    // users
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);',
    // roles/permissions lookup
    'CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);',
    'CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);',
    // role_permissions
    'CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);',
    'CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permissions_role_permission ON role_permissions(role_id, permission_id);',
    // user_roles
    'CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role_id);'
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
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${createUsersTable.replace(/\s+/g,' ').trim()}"`, { stdio: 'inherit' });

    // Ensure columns exist if table was created earlier without them
    const alterUsersAddUpdatedAt = `ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;`;
    const alterUsersAddLastLoginAt = `ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;`;
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${alterUsersAddUpdatedAt}"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${alterUsersAddLastLoginAt}"`, { stdio: 'inherit' });

    // RBAC tables
    const createRolesTable = `
      CREATE TABLE IF NOT EXISTS roles (
        role_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    const createPermissionsTable = `
      CREATE TABLE IF NOT EXISTS permissions (
        permission_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    const createRolePermissionsTable = `
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_permission_id SERIAL PRIMARY KEY,
        permission_id INTEGER REFERENCES permissions(permission_id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(role_id) ON DELETE CASCADE,
        permission VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    const createUserRolesTable = `
      CREATE TABLE IF NOT EXISTS user_roles (
        user_role_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(role_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    for (const stmt of [createRolesTable, createPermissionsTable, createRolePermissionsTable, createUserRolesTable]) {
      const clean = stmt.replace(/\s+/g, ' ').trim();
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${clean}"`, { stdio: 'inherit' });
    }
    
    // Create indexes
    const createIndexes = [
      // users
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);',
      // roles/permissions lookup
      'CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);',
      'CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);',
      // role_permissions
      'CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);',
      'CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permissions_role_permission ON role_permissions(role_id, permission_id);',
      // user_roles
      'CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role_id);'
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
      // If we were using DATABASE_URL, do not attempt Docker fallback
      if (config.connectionString) {
        throw new Error('Failed to connect using DATABASE_URL');
      }
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

