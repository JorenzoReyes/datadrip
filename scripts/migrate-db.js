#!/usr/bin/env node

/**
 * Database Migration Script
 * This script handles database schema changes and new table creation
 * Works with both local PostgreSQL and Docker containers
 * 
 * Usage:
 *   node scripts/migrate-db.js add-table <table_name>
 *   node scripts/migrate-db.js list-tables
 *   node scripts/migrate-db.js reset-db
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

// Database configuration preferring DATABASE_URL; Docker/local fallback otherwise
function getDatabaseConfig() {
  if (process.env.DATABASE_URL) {
    console.log('🔗 Using DATABASE_URL environment variable');
    return {
      connectionString: process.env.DATABASE_URL,
      // For Railway/tunnel, use SSL but do not reject self-signed certs
      ssl: { rejectUnauthorized: false }
    };
  }

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

// List all tables in the database using Docker
async function listTablesWithDocker() {
  try {
    console.log('🔄 Listing tables via Docker...');
    const result = execSync(
      `docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"`,
      { encoding: 'utf8' }
    );
    
    console.log('\n📋 Current Tables:');
    const lines = result.split('\n').filter(line => line.trim() && !line.includes('table_name') && !line.includes('---') && !line.includes('rows)'));
    if (lines.length === 0) {
      console.log('   No tables found');
    } else {
      lines.forEach(line => {
        const tableName = line.trim();
        if (tableName) {
          console.log(`   - ${tableName}`);
        }
      });
    }
    console.log('');
    return true;
  } catch (error) {
    console.error('❌ Docker list tables failed:', error.message);
    return false;
  }
}

// List all tables in the database
async function listTables(pool) {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Current Tables:');
    if (result.rows.length === 0) {
      console.log('   No tables found');
    } else {
      result.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
    console.log('');
  } catch (error) {
    console.error('Error listing tables:', error);
  }
}

// Add a new table using Docker
async function addTableWithDocker(tableName) {
  const tableDefinitions = {
    'products': `
      CREATE TABLE IF NOT EXISTS products (
        product_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    'orders': `
      CREATE TABLE IF NOT EXISTS orders (
        order_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    'order_items': `
      CREATE TABLE IF NOT EXISTS order_items (
        item_id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    'categories': `
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    'user_sessions': `
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        session_token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    'user_roles': `
      CREATE TABLE IF NOT EXISTS user_roles (
        user_role_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(role_id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    'roles': `
      CREATE TABLE IF NOT EXISTS roles (
        role_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    'role_permissions': `
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_permission_id SERIAL PRIMARY KEY,
        permission_id INTEGER REFERENCES permissions(permission_id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(role_id) ON DELETE CASCADE,
        permission VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    'permissions': `
      CREATE TABLE IF NOT EXISTS permissions (
        permission_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `
  };

  if (!tableDefinitions[tableName]) {
    console.error(`❌ Table definition not found for: ${tableName}`);
    console.log('Available tables:', Object.keys(tableDefinitions).join(', '));
    return false;
  }

  try {
    console.log(`🔄 Creating table '${tableName}' via Docker...`);
    // Clean up the SQL for single-line execution
    const cleanSQL = tableDefinitions[tableName].replace(/\s+/g, ' ').trim();
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${cleanSQL}"`, { stdio: 'inherit' });
    console.log(`✅ Table '${tableName}' created successfully`);
    
    // Create common indexes
    if (tableName === 'products') {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);"`, { stdio: 'inherit' });
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);"`, { stdio: 'inherit' });
    } else if (tableName === 'orders') {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);"`, { stdio: 'inherit' });
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);"`, { stdio: 'inherit' });
    } else if (tableName === 'user_sessions') {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);"`, { stdio: 'inherit' });
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);"`, { stdio: 'inherit' });
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error creating table '${tableName}':`, error.message);
    return false;
  }
}

// Add a new table (example)
async function addTable(pool, tableName) {
  const tableDefinitions = {
    'products': `
      CREATE TABLE IF NOT EXISTS products (
        product_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    'orders': `
      CREATE TABLE IF NOT EXISTS orders (
        order_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    'order_items': `
      CREATE TABLE IF NOT EXISTS order_items (
        item_id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    'categories': `
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    'user_sessions': `
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        session_token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `
  };

  if (!tableDefinitions[tableName]) {
    console.error(`❌ Table definition not found for: ${tableName}`);
    console.log('Available tables:', Object.keys(tableDefinitions).join(', '));
    return;
  }

  try {
    await pool.query(tableDefinitions[tableName]);
    console.log(`✅ Table '${tableName}' created successfully`);
    
    // Create common indexes
    if (tableName === 'products') {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);');
    } else if (tableName === 'orders') {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);');
    } else if (tableName === 'user_sessions') {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);');
    }
    
  } catch (error) {
    console.error(`❌ Error creating table '${tableName}':`, error.message);
  }
}

// Reset database using Docker (drop ALL tables, including users), then re-init
async function resetDatabaseWithDocker() {
  try {
    console.log('⚠️  WARNING: This will drop ALL tables including users!');
    console.log('This action cannot be undone.');
    console.log('🔄 Resetting database via Docker...');
    
    // Get all tables
    const result = execSync(
      `docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"`,
      { encoding: 'utf8' }
    );
    
    const lines = result.split('\n').filter(line => line.trim() && !line.includes('table_name') && !line.includes('---') && !line.includes('rows)'));
    
    if (lines.length === 0) {
      console.log('No tables to drop');
      return true;
    }
    
    // Drop all tables
    for (const line of lines) {
      const tableName = line.trim();
      if (tableName) {
        execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "DROP TABLE IF EXISTS ${tableName} CASCADE;"`, { stdio: 'inherit' });
        console.log(`🗑️  Dropped table: ${tableName}`);
      }
    }
    
    console.log('🔧 Re-initializing database schema...');
    execSync('node scripts/init-db.js', { stdio: 'inherit' });
    console.log('✅ Database reset and initialization completed via Docker');
    return true;
  } catch (error) {
    console.error('❌ Docker reset failed:', error.message);
    return false;
  }
}

// Reset database (drop ALL tables including users), then re-init
async function resetDatabase(pool) {
  try {
    console.log('⚠️  WARNING: This will drop ALL tables including users!');
    console.log('This action cannot be undone.');
    
    // Get all tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    
    if (result.rows.length === 0) {
      console.log('No tables to drop');
      console.log('🔧 Re-initializing database schema...');
      execSync('node scripts/init-db.js', { stdio: 'inherit' });
      console.log('✅ Database reset and initialization completed');
      return;
    }
    
    // Drop all tables
    for (const row of result.rows) {
      await pool.query(`DROP TABLE IF EXISTS ${row.table_name} CASCADE;`);
      console.log(`🗑️  Dropped table: ${row.table_name}`);
    }
    
    console.log('🔧 Re-initializing database schema...');
    execSync('node scripts/init-db.js', { stdio: 'inherit' });
    console.log('✅ Database reset and initialization completed');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const tableName = args[1];

  if (!command) {
    console.log(`
📚 Database Migration Tool

Usage:
  node scripts/migrate-db.js <command> [options]

Commands:
  list-tables              List all tables in the database
  add-table <table_name>   Add a new table (products, orders, order_items, categories, user_sessions)
  reset-db                 Reset database (drop all tables except users)
  help                     Show this help message

Examples:
  node scripts/migrate-db.js list-tables
  node scripts/migrate-db.js add-table products
  node scripts/migrate-db.js reset-db
    `);
    process.exit(0);
  }

  const config = getDatabaseConfig();
  const pool = new Pool(config);

  try {
    // Test connection
    const isConnected = await testConnection(pool);
    if (!isConnected) {
      // If using DATABASE_URL, do not attempt Docker fallback
      if (config.connectionString) {
        throw new Error('Failed to connect using DATABASE_URL');
      }
      console.log('⚠️  Direct connection failed, trying Docker fallback...');
      
      // Try Docker fallback for each command
      switch (command) {
        case 'list-tables':
          const listSuccess = await listTablesWithDocker();
          if (!listSuccess) {
            throw new Error('Failed to list tables via both direct connection and Docker');
          }
          return;
          
        case 'add-table':
          if (!tableName) {
            console.error('❌ Table name is required');
            console.log('Usage: node scripts/migrate-db.js add-table <table_name>');
            process.exit(1);
          }
          const addSuccess = await addTableWithDocker(tableName);
          if (!addSuccess) {
            throw new Error('Failed to add table via both direct connection and Docker');
          }
          return;
          
        case 'reset-db':
          const resetSuccess = await resetDatabaseWithDocker();
          if (!resetSuccess) {
            throw new Error('Failed to reset database via both direct connection and Docker');
          }
          return;
          
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    }

    console.log('✅ Database connected successfully');

    switch (command) {
      case 'list-tables':
        await listTables(pool);
        break;
        
      case 'add-table':
        if (!tableName) {
          console.error('❌ Table name is required');
          console.log('Usage: node scripts/migrate-db.js add-table <table_name>');
          process.exit(1);
        }
        await addTable(pool, tableName);
        break;
        
      case 'reset-db':
        await resetDatabase(pool);
        break;
        
      case 'help':
        console.log('Use the script without arguments to see help');
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Use "node scripts/migrate-db.js help" for available commands');
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main();
