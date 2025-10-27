#!/usr/bin/env node

/**
 * Database Migration Script
 * This script handles database schema changes and new table creation
 * Uses Docker PostgreSQL container
 * 
 * Usage:
 *   node scripts/migrate-db.js add-table <table_name>
 *   node scripts/migrate-db.js list-tables
 *   node scripts/migrate-db.js reset-db
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

// Database configuration - Docker only
function getDatabaseConfig() {
  if (process.env.DATABASE_URL) {
    console.log('🔗 Using DATABASE_URL environment variable');
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    };
  }

  console.log('🐳 Using Docker PostgreSQL configuration');
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'datadrip',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
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

// Migrate products table from VARCHAR taxonomy fields to foreign keys
async function migrateProductsToTaxonomy(pool) {
  try {
    console.log('🔄 Starting products table migration to taxonomy system...');
    
    // Check if migration is needed
    const needsMigration = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name IN ('category', 'subcategory', 'product_type')
    `);
    
    if (needsMigration.rows.length === 0) {
      console.log('✅ Products table already uses foreign keys. No migration needed.');
      return;
    }
    
    // Check if new columns exist
    const newColumnsExist = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name IN ('category_id', 'subcategory_id', 'product_type_id')
    `);
    
    if (newColumnsExist.rows.length < 3) {
      console.log('📝 Adding new foreign key columns...');
      
      // Add new foreign key columns (one at a time)
      await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER`);
      await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory_id INTEGER`);
      await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type_id INTEGER`);
      
      // Add foreign key constraints
      await pool.query(`
        ALTER TABLE products 
        ADD CONSTRAINT IF NOT EXISTS fk_products_category 
        FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL
      `);
      
      await pool.query(`
        ALTER TABLE products 
        ADD CONSTRAINT IF NOT EXISTS fk_products_subcategory 
        FOREIGN KEY (subcategory_id) REFERENCES subcategories(subcategory_id) ON DELETE SET NULL
      `);
      
      await pool.query(`
        ALTER TABLE products 
        ADD CONSTRAINT IF NOT EXISTS fk_products_product_type 
        FOREIGN KEY (product_type_id) REFERENCES product_types(product_type_id) ON DELETE SET NULL
      `);
      
      console.log('✅ Foreign key columns and constraints added');
    } else {
      console.log('✅ Foreign key columns already exist');
    }
    
    // Migrate existing data
    console.log('🔄 Migrating existing product data...');
    const products = await pool.query(`
      SELECT product_id, category, subcategory, product_type 
      FROM products 
      WHERE category IS NOT NULL OR subcategory IS NOT NULL OR product_type IS NOT NULL
    `);
    
    console.log(`📊 Found ${products.rows.length} products to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const product of products.rows) {
      try {
        let categoryId = null;
        let subcategoryId = null;
        let productTypeId = null;
        
        // Map category
        if (product.category) {
          const categoryResult = await pool.query(
            'SELECT category_id FROM categories WHERE name = $1',
            [product.category]
          );
          if (categoryResult.rows.length > 0) {
            categoryId = categoryResult.rows[0].category_id;
          }
        }
        
        // Map subcategory
        if (product.subcategory && categoryId) {
          const subcategoryResult = await pool.query(
            'SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2',
            [product.subcategory, categoryId]
          );
          if (subcategoryResult.rows.length > 0) {
            subcategoryId = subcategoryResult.rows[0].subcategory_id;
          }
        }
        
        // Map product type
        if (product.product_type && subcategoryId) {
          const productTypeResult = await pool.query(
            'SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2',
            [product.product_type, subcategoryId]
          );
          if (productTypeResult.rows.length > 0) {
            productTypeId = productTypeResult.rows[0].product_type_id;
          }
        }
        
        // Update the product with new foreign keys
        await pool.query(`
          UPDATE products 
          SET category_id = $1, subcategory_id = $2, product_type_id = $3
          WHERE product_id = $4
        `, [categoryId, subcategoryId, productTypeId, product.product_id]);
        
        migratedCount++;
        
        if (migratedCount % 10 === 0) {
          console.log(`📈 Migrated ${migratedCount}/${products.rows.length} products...`);
        }
        
      } catch (error) {
        console.error(`⚠️  Failed to migrate product ${product.product_id}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log(`✅ Data migration completed: ${migratedCount} migrated, ${skippedCount} skipped`);
    console.log('🎉 Products table migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Products table migration failed:', error);
    throw error;
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
  migrate-products         Migrate products table from VARCHAR taxonomy to foreign keys
  reset-db                 Reset database (drop all tables except users)
  help                     Show this help message

Examples:
  node scripts/migrate-db.js list-tables
  node scripts/migrate-db.js add-table products
  node scripts/migrate-db.js migrate-products
  node scripts/migrate-db.js reset-db
    `);
    process.exit(0);
  }

  const config = getDatabaseConfig();
  const pool = new Pool(config);

  try {
    // Test connection
    const isConnected = await testConnection(pool);
    const dockerAvailable = checkDockerPostgresRunning();

    // Run on direct target if connected
    if (isConnected) {
      console.log('✅ Database connected successfully (direct/DATABASE_URL)');
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
        case 'migrate-products':
          await migrateProductsToTaxonomy(pool);
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
    } else {
      console.warn('⚠️  Direct connection failed. Skipping direct migration.');
    }

    // Also perform the command against Docker if available
    if (dockerAvailable) {
      switch (command) {
        case 'list-tables':
          await listTablesWithDocker();
          break;
        case 'add-table':
          if (!tableName) {
            console.error('❌ Table name is required');
            console.log('Usage: node scripts/migrate-db.js add-table <table_name>');
            process.exit(1);
          }
          await addTableWithDocker(tableName);
          break;
        case 'migrate-products':
          console.log('⚠️  Products migration requires direct database connection. Skipping Docker execution.');
          break;
        case 'reset-db':
          await resetDatabaseWithDocker();
          break;
        case 'help':
          // no-op for Docker
          break;
        default:
          // ignore unknown
          break;
      }
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
