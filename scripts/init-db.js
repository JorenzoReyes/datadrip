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
  const isLocalPostgresRunning = checkLocalPostgresRunning();

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

  if (isLocalPostgresRunning) {
    console.log('💻 Using local PostgreSQL configuration');
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'datadrip',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }

  console.log('⚠️  No PostgreSQL instance detected, using default configuration');
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'datadrip',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
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

// Check if local PostgreSQL is running
function checkLocalPostgresRunning() {
  try {
    // Try to connect to local PostgreSQL on port 5432
    execSync('pg_isready -h localhost -p 5432', { stdio: 'ignore' });
    return true;
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

// Create database if it doesn't exist (for local PostgreSQL)
async function createDatabaseIfNotExists() {
  const config = getDatabaseConfig();
  
  // Only try to create database for local PostgreSQL, not for DATABASE_URL or Docker
  if (config.connectionString) {
    return true; // Skip for DATABASE_URL
  }

  try {
    // Try to connect to postgres database to create our target database
    const adminConfig = {
      ...config,
      database: 'postgres' // Connect to default postgres database
    };
    
    const adminPool = new Pool(adminConfig);
    
    // Check if our target database exists
    const result = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [config.database]
    );
    
    if (result.rows.length === 0) {
      console.log(`📦 Creating database '${config.database}'...`);
      await adminPool.query(`CREATE DATABASE "${config.database}"`);
      console.log(`✅ Database '${config.database}' created successfully`);
    } else {
      console.log(`✅ Database '${config.database}' already exists`);
    }
    
    await adminPool.end();
    return true;
  } catch (error) {
    console.error('⚠️  Could not create database (this may be normal if database already exists):', error.message);
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

  // Accounts table (tenant)
  const createAccountsTable = `
    CREATE TABLE IF NOT EXISTS accounts (
      account_id SERIAL PRIMARY KEY,
      owner_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      name VARCHAR(150) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Products table
  const createProductsTable = `
    CREATE TABLE IF NOT EXISTS products (
      product_id SERIAL PRIMARY KEY,
      owner_user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
      account_id INTEGER REFERENCES accounts(account_id) ON DELETE CASCADE,
      sku VARCHAR(100) UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      highlights TEXT,
      in_box TEXT,
      brand VARCHAR(100),
      category1 VARCHAR(100),
      category2 VARCHAR(100),
      category3 VARCHAR(100),
      category4 VARCHAR(100),
      category5 VARCHAR(100),
      price DECIMAL(12,2) NOT NULL DEFAULT 0,
      special_price DECIMAL(12,2),
      cost DECIMAL(12,2),
      currency CHAR(3) DEFAULT 'PHP',
      stock INTEGER NOT NULL DEFAULT 0,
      reorder_level INTEGER DEFAULT 0,
      sales_count INTEGER NOT NULL DEFAULT 0,
      sales_revenue DECIMAL(14,2) NOT NULL DEFAULT 0,
      weight_value DECIMAL(10,3),
      weight_unit VARCHAR(2),
      length_cm DECIMAL(8,2),
      width_cm DECIMAL(8,2),
      height_cm DECIMAL(8,2),
      has_dangerous BOOLEAN NOT NULL DEFAULT false,
      warranty_type VARCHAR(50),
      warranty_period VARCHAR(20),
      warranty_policy TEXT,
      barcode VARCHAR(64),
      attributes JSONB,
      images JSONB,
      promotion_image TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Shops table (per-platform store under an account)
  const createShopsTable = `
    CREATE TABLE IF NOT EXISTS shops (
      shop_id SERIAL PRIMARY KEY,
      account_id INTEGER REFERENCES accounts(account_id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      platform VARCHAR(30) NOT NULL, -- 'tiktok' | 'shopee' | 'lazada' | 'custom'
      platform_shop_id VARCHAR(120) NOT NULL,
      url TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      products_count INTEGER DEFAULT 0,
      followers_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      chat_performance_percent DECIMAL(5,2),
      rating_value DECIMAL(3,2),
      rating_count INTEGER,
      joined_at TIMESTAMP,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (platform, platform_shop_id)
    );
  `;

  // Product listings per platform
  const createProductListingsTable = `
    CREATE TABLE IF NOT EXISTS product_listings (
      product_listing_id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
      account_id INTEGER REFERENCES accounts(account_id) ON DELETE CASCADE,
      shop_id INTEGER REFERENCES shops(shop_id) ON DELETE CASCADE,
      platform VARCHAR(30) NOT NULL,
      platform_product_id VARCHAR(100) NOT NULL,
      title VARCHAR(255),
      listing_price DECIMAL(12,2),
      currency CHAR(3) DEFAULT 'PHP',
      listing_status VARCHAR(30) DEFAULT 'active',
      url TEXT,
      category_path TEXT,
      commission_rate DECIMAL(5,2),
      warehouse_sku VARCHAR(100),
      extra JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (platform, platform_product_id)
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
  await pool.query(createAccountsTable);
  
  // Create daily_sales_aggregated table for efficient sales tracking
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_sales_aggregated (
      account_id INTEGER REFERENCES accounts(account_id) ON DELETE CASCADE,
      sale_date DATE NOT NULL,
      total_sales DECIMAL(12,2) DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      platform_breakdown JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (account_id, sale_date)
    );
  `);

  await pool.query(createShopsTable);
  await pool.query(createProductsTable);
  
  // Create product_sales table for individual product sales tracking
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_sales (
      sale_id SERIAL PRIMARY KEY,
      account_id INTEGER REFERENCES accounts(account_id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
      shop_id INTEGER REFERENCES shops(shop_id) ON DELETE CASCADE,
      platform VARCHAR(30) NOT NULL,
      sale_date DATE NOT NULL,
      quantity_sold INTEGER NOT NULL DEFAULT 1,
      unit_price DECIMAL(12,2) NOT NULL,
      total_sales DECIMAL(12,2) NOT NULL,
      order_id VARCHAR(100),
      customer_info JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(createProductListingsTable);
  await pool.query(createRolesTable);
  await pool.query(createPermissionsTable);
  await pool.query(createRolePermissionsTable);
  await pool.query(createUserRolesTable);

  // Ensure new columns exist on older schemas before creating indexes
  await pool.query(`
    ALTER TABLE IF EXISTS product_listings 
    ADD COLUMN IF NOT EXISTS shop_id INTEGER REFERENCES shops(shop_id) ON DELETE CASCADE;
  `);

  // Create indexes for better performance
  const createIndexes = [
    // users
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);',
    // accounts
    'CREATE INDEX IF NOT EXISTS idx_accounts_owner_user_id ON accounts(owner_user_id);',
    'CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);',
    // shops
    'CREATE INDEX IF NOT EXISTS idx_shops_account_id ON shops(account_id);',
    'CREATE INDEX IF NOT EXISTS idx_shops_platform_shop ON shops(platform, platform_shop_id);',
    'CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);',
    'CREATE INDEX IF NOT EXISTS idx_shops_name ON shops(name);',
    // products
    'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);',
    'CREATE INDEX IF NOT EXISTS idx_products_category1 ON products(category1);',
    'CREATE INDEX IF NOT EXISTS idx_products_owner_user_id ON products(owner_user_id);',
    'CREATE INDEX IF NOT EXISTS idx_products_account_id ON products(account_id);',
    "CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);",
    // product_listings
    'CREATE INDEX IF NOT EXISTS idx_product_listings_product_id ON product_listings(product_id);',
    'CREATE INDEX IF NOT EXISTS idx_product_listings_account_id ON product_listings(account_id);',
    'CREATE INDEX IF NOT EXISTS idx_product_listings_shop_id ON product_listings(shop_id);',
    'CREATE INDEX IF NOT EXISTS idx_product_listings_platform ON product_listings(platform);',
    'CREATE INDEX IF NOT EXISTS idx_product_listings_platform_pid ON product_listings(platform_product_id);',
    // product_sales
    'CREATE INDEX IF NOT EXISTS idx_product_sales_date_product ON product_sales(sale_date, product_id, account_id);',
    // daily_sales_aggregated
    'CREATE INDEX IF NOT EXISTS idx_daily_sales_agg_date ON daily_sales_aggregated(sale_date, account_id);',
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

// Update existing tables with new columns or modifications
async function updateTables(pool) {
  console.log('🔄 Checking for table updates...');
  
  try {
    // Update users table with any missing columns
    const updateUsersTable = [
      `ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';`
    ];

    for (const updateQuery of updateUsersTable) {
      await pool.query(updateQuery);
    }

    // Update timestamps for existing records if needed
    await pool.query(`
      UPDATE users 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE updated_at IS NULL OR updated_at = created_at;
    `);

    await pool.query(`
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP 
      WHERE last_login_at IS NULL OR last_login_at = created_at;
    `);

    console.log('✅ Table updates completed successfully');
  } catch (error) {
    console.error('⚠️  Some table updates failed (this may be normal for new databases):', error.message);
    // Don't throw error here as this is expected for new databases
  }
}

// Seed additional demo users with domain focuses (idempotent)
async function seedAdditionalUsers(pool) {
  try {
    await pool.query(`
      INSERT INTO users (username, fname, lname, email, password)
      SELECT 'electronics_owner','Electra','Shop','electronics.owner@example.com','electra123'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='electronics.owner@example.com');
    `);
    await pool.query(`
      INSERT INTO users (username, fname, lname, email, password)
      SELECT 'cosmetics_owner','Cosma','Beauty','cosmetics.owner@example.com','cosma123'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='cosmetics.owner@example.com');
    `);
    await pool.query(`
      INSERT INTO users (username, fname, lname, email, password)
      SELECT 'food_owner','Gusto','Bites','food.owner@example.com','gusto123'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='food.owner@example.com');
    `);
    console.log('✅ Seeded additional demo users');
  } catch (error) {
    console.error('⚠️  Seeding additional users failed:', error.message);
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

    // Create accounts table
    const createAccountsTable = `
      CREATE TABLE IF NOT EXISTS accounts (
        account_id SERIAL PRIMARY KEY,
        owner_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        name VARCHAR(150) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${createAccountsTable.replace(/\s+/g,' ').trim()}"`, { stdio: 'inherit' });

    // Create shops table (after accounts exists)
    const createShopsTable = `
      CREATE TABLE IF NOT EXISTS shops (
        shop_id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES accounts(account_id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        platform VARCHAR(30) NOT NULL,
        platform_shop_id VARCHAR(120) NOT NULL,
        url TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        products_count INTEGER DEFAULT 0,
        followers_count INTEGER DEFAULT 0,
        following_count INTEGER DEFAULT 0,
        chat_performance_percent DECIMAL(5,2),
        rating_value DECIMAL(3,2),
        rating_count INTEGER,
        joined_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (platform, platform_shop_id)
      );
    `;
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${createShopsTable.replace(/\s+/g,' ').trim()}"`, { stdio: 'inherit' });

    // Create products table (after accounts exists)
    const createProductsTable = `
      CREATE TABLE IF NOT EXISTS products (
        product_id SERIAL PRIMARY KEY,
        owner_user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        account_id INTEGER REFERENCES accounts(account_id) ON DELETE CASCADE,
        sku VARCHAR(100) UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        highlights TEXT,
        in_box TEXT,
        brand VARCHAR(100),
        category1 VARCHAR(100),
        category2 VARCHAR(100),
        category3 VARCHAR(100),
        category4 VARCHAR(100),
        category5 VARCHAR(100),
        price DECIMAL(12,2) NOT NULL DEFAULT 0,
        special_price DECIMAL(12,2),
        cost DECIMAL(12,2),
        currency CHAR(3) DEFAULT 'PHP',
        stock INTEGER NOT NULL DEFAULT 0,
        reorder_level INTEGER DEFAULT 0,
        sales_count INTEGER NOT NULL DEFAULT 0,
        sales_revenue DECIMAL(14,2) NOT NULL DEFAULT 0,
        weight_value DECIMAL(10,3),
        weight_unit VARCHAR(2),
        length_cm DECIMAL(8,2),
        width_cm DECIMAL(8,2),
        height_cm DECIMAL(8,2),
        has_dangerous BOOLEAN NOT NULL DEFAULT false,
        warranty_type VARCHAR(50),
        warranty_period VARCHAR(20),
        warranty_policy TEXT,
        barcode VARCHAR(64),
        attributes JSONB,
        images JSONB,
        promotion_image TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${createProductsTable.replace(/\s+/g,' ').trim()}"`, { stdio: 'inherit' });

    // Create product_listings table
    const createProductListingsTable = `
      CREATE TABLE IF NOT EXISTS product_listings (
        product_listing_id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
        account_id INTEGER REFERENCES accounts(account_id) ON DELETE CASCADE,
        shop_id INTEGER REFERENCES shops(shop_id) ON DELETE CASCADE,
        platform VARCHAR(30) NOT NULL,
        platform_product_id VARCHAR(100) NOT NULL,
        title VARCHAR(255),
        listing_price DECIMAL(12,2),
        currency CHAR(3) DEFAULT 'PHP',
        listing_status VARCHAR(30) DEFAULT 'active',
        url TEXT,
        category_path TEXT,
        commission_rate DECIMAL(5,2),
        warehouse_sku VARCHAR(100),
        extra JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (platform, platform_product_id)
      );
    `;
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${createProductListingsTable.replace(/\s+/g,' ').trim()}"`, { stdio: 'inherit' });

    // Ensure new columns exist on older schemas
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "ALTER TABLE IF EXISTS product_listings ADD COLUMN IF NOT EXISTS shop_id INTEGER REFERENCES shops(shop_id) ON DELETE CASCADE;"`, { stdio: 'inherit' });

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
      // products
      'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);',
      'CREATE INDEX IF NOT EXISTS idx_products_category1 ON products(category1);',
      'CREATE INDEX IF NOT EXISTS idx_products_owner_user_id ON products(owner_user_id);',
      'CREATE INDEX IF NOT EXISTS idx_products_account_id ON products(account_id);',
      'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);',
      // accounts
      'CREATE INDEX IF NOT EXISTS idx_accounts_owner_user_id ON accounts(owner_user_id);',
      'CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);',
      // shops
      'CREATE INDEX IF NOT EXISTS idx_shops_account_id ON shops(account_id);',
      'CREATE INDEX IF NOT EXISTS idx_shops_platform_shop ON shops(platform, platform_shop_id);',
      'CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);',
      'CREATE INDEX IF NOT EXISTS idx_shops_name ON shops(name);',
      // product_listings
      'CREATE INDEX IF NOT EXISTS idx_product_listings_product_id ON product_listings(product_id);',
      'CREATE INDEX IF NOT EXISTS idx_product_listings_account_id ON product_listings(account_id);',
      'CREATE INDEX IF NOT EXISTS idx_product_listings_shop_id ON product_listings(shop_id);',
      'CREATE INDEX IF NOT EXISTS idx_product_listings_platform ON product_listings(platform);',
      'CREATE INDEX IF NOT EXISTS idx_product_listings_platform_pid ON product_listings(platform_product_id);',
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
    
    // Update existing tables with any new columns or modifications
    const updateUsersTable = [
      `ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';`
    ];

    for (const updateQuery of updateUsersTable) {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${updateQuery}"`, { stdio: 'inherit' });
    }

    // Update timestamps for existing records if needed
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL OR updated_at = created_at;"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE last_login_at IS NULL OR last_login_at = created_at;"`, { stdio: 'inherit' });
    
    console.log('✅ Database initialized and updated successfully via Docker');
    return true;
  } catch (error) {
    console.error('❌ Docker initialization failed:', error.message);
    return false;
  }
}

// Initialize database with support for both direct and Docker targets
async function initializeDatabase() {
  const config = getDatabaseConfig();
  
  // Try to create database if it doesn't exist (for local PostgreSQL)
  await createDatabaseIfNotExists();
  
  const pool = new Pool(config);

  try {
    // Direct / DATABASE_URL target
    const isConnected = await testConnection(pool);
    if (isConnected) {
      console.log('Database connected successfully (direct/DATABASE_URL)');
      await createTables(pool);
      await updateTables(pool);
      await seedAdditionalUsers(pool);
      console.log('Database initialized and updated successfully (direct/DATABASE_URL)');
    } else {
      console.warn('⚠️  Direct connection failed. Skipping direct initialization.');
    }

    // Docker target (in addition to direct)
    const dockerAvailable = checkDockerAvailability() && checkDockerPostgresRunning();
    if (dockerAvailable) {
      const dockerSuccess = await initializeDatabaseWithDocker();
      if (!dockerSuccess) {
        console.warn('⚠️  Docker initialization failed.');
      }
    }
  } catch (error) {
    console.error('Database initialization encountered an error:', error);
    // Best effort Docker init even if direct path errored
    const dockerAvailable = checkDockerAvailability() && checkDockerPostgresRunning();
    if (dockerAvailable) {
      const dockerSuccess = await initializeDatabaseWithDocker();
      if (!dockerSuccess) throw error;
    } else {
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

