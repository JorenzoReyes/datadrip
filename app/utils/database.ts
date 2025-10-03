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
  // If DATABASE_URL is provided (e.g., on Railway), skip individual var checks
  if (!process.env.DATABASE_URL) {
    if (!process.env.DB_HOST && process.env.NODE_ENV === 'production') {
      throw new Error('DB_HOST environment variable is required in production');
    }
    if (!process.env.DB_PASSWORD && process.env.NODE_ENV === 'production') {
      throw new Error('DB_PASSWORD environment variable is required in production');
    }
  }

  return config;
}

// Create database connection pool
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    // Prefer single DATABASE_URL when available (e.g., Railway)
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    } else {
      const config = getDatabaseConfig();
      pool = new Pool({
        ...config,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      });
    }

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

// User-related database operations
export interface User {
  user_id: number;
  username: string;
  fname: string;
  lname: string;
  email: string;
  password: string;
  status: string;
  created_at: string;
}

export interface CreateUserData {
  username: string;
  fname: string;
  lname: string;
  email: string;
  password: string;
  status?: string;
}

// Create a new user
export async function createUser(userData: CreateUserData): Promise<User | null> {
  try {
    const result = await query<User>(
      `INSERT INTO users (username, fname, lname, email, password, status) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [userData.username, userData.fname, userData.lname, userData.email, userData.password, userData.status || 'pending']
    );
    return result[0] || null;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Find user by email
export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await queryOne<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
}

// Find user by username
export async function findUserByUsername(username: string): Promise<User | null> {
  try {
    const result = await queryOne<User>(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result;
  } catch (error) {
    console.error('Error finding user by username:', error);
    throw error;
  }
}

// Find user by email or username
export async function findUserByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
  try {
    const result = await queryOne<User>(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [emailOrUsername]
    );
    return result;
  } catch (error) {
    console.error('Error finding user by email or username:', error);
    throw error;
  }
}

// Check if email exists
export async function emailExists(email: string): Promise<boolean> {
  try {
    const result = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE email = $1',
      [email]
    );
    return result ? parseInt(result.count) > 0 : false;
  } catch (error) {
    console.error('Error checking if email exists:', error);
    throw error;
  }
}

// Check if username exists
export async function usernameExists(username: string): Promise<boolean> {
  try {
    const result = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE username = $1',
      [username]
    );
    return result ? parseInt(result.count) > 0 : false;
  } catch (error) {
    console.error('Error checking if username exists:', error);
    throw error;
  }
}

// Update user
export async function updateUser(userId: number, userData: Partial<CreateUserData>): Promise<User | null> {
  try {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (userData.username) {
      fields.push(`username = $${paramCount++}`);
      values.push(userData.username);
    }
    if (userData.fname) {
      fields.push(`fname = $${paramCount++}`);
      values.push(userData.fname);
    }
    if (userData.lname) {
      fields.push(`lname = $${paramCount++}`);
      values.push(userData.lname);
    }
    if (userData.email) {
      fields.push(`email = $${paramCount++}`);
      values.push(userData.email);
    }
    if (userData.password) {
      fields.push(`password = $${paramCount++}`);
      values.push(userData.password);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(userId);
    const result = await query<User>(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = $${paramCount} RETURNING *`,
      values
    );
    return result[0] || null;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

// Delete user
export async function deleteUser(userId: number): Promise<boolean> {
  try {
    await query('DELETE FROM users WHERE user_id = $1', [userId]);
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

// Get all users (for admin purposes)
export async function getAllUsers(): Promise<User[]> {
  try {
    const result = await query<User>('SELECT * FROM users ORDER BY created_at DESC');
    return result;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

// RBAC helpers
export async function getUserRoles(userId: number): Promise<string[]> {
  try {
    const rows = await query<{ name: string }>(
      `SELECT r.name
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );
    return rows.map(r => r.name);
  } catch (error) {
    console.error('Error getting user roles:', error);
    return [];
  }
}

export async function getUserPermissions(userId: number): Promise<string[]> {
  try {
    const rows = await query<{ name: string }>(
      `SELECT DISTINCT p.name
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.role_id
       JOIN role_permissions rp ON rp.role_id = r.role_id
       JOIN permissions p ON p.permission_id = rp.permission_id
       WHERE ur.user_id = $1`,
      [userId]
    );
    return rows.map(r => r.name);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
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
      user_id SERIAL PRIMARY KEY,
      username VARCHAR(30) NOT NULL,
      fname VARCHAR(50) NOT NULL,
      lname VARCHAR(30) NOT NULL,
      email VARCHAR(100) NOT NULL,
      password VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Execute table creation queries
  await query(createUsersTable);

  // Create indexes for better performance
  const createIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);',
  ];

  for (const indexQuery of createIndexes) {
    await query(indexQuery);
  }
}
