#!/usr/bin/env node

/**
 * Database Migration Script
 * This script handles database schema changes and new table creation
 * 
 * Usage:
 *   node scripts/migrate-db.js add-table <table_name>
 *   node scripts/migrate-db.js list-tables
 *   node scripts/migrate-db.js reset-db
 */

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

// Reset database (drop all tables except users)
async function resetDatabase(pool) {
  try {
    console.log('⚠️  WARNING: This will drop all tables except users!');
    console.log('This action cannot be undone.');
    
    // Get all tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name != 'users';
    `);
    
    if (result.rows.length === 0) {
      console.log('No tables to drop');
      return;
    }
    
    // Drop all tables except users
    for (const row of result.rows) {
      await pool.query(`DROP TABLE IF EXISTS ${row.table_name} CASCADE;`);
      console.log(`🗑️  Dropped table: ${row.table_name}`);
    }
    
    console.log('✅ Database reset completed');
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
      throw new Error('Failed to connect to database');
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
