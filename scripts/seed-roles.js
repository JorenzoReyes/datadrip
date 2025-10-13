#!/usr/bin/env node

/**
 * Seed base roles and permissions into the database
 * Roles: business_owner, admin, system_admin
 * Permissions: create, read, update, deactivate, view_dashboard, view_products, view_insights
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

function checkDockerAvailability() {
  try { execSync('docker --version', { stdio: 'ignore' }); return true; } catch { return false; }
}

function checkDockerPostgresRunning() {
  try {
    const out = execSync('docker ps --filter "name=postgres" --format "{{.Names}}"', { encoding: 'utf8' });
    return out.includes('postgres') || out.includes('datadrip');
  } catch { return false; }
}

function getDatabaseConfig() {
  // Prefer a single DATABASE_URL (Railway/tunnel). Use SSL but allow self-signed.
  if (process.env.DATABASE_URL) {
    console.log('🔗 Using DATABASE_URL environment variable');
    return { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } };
  }
  // Otherwise check for Docker/local
  const isDocker = checkDockerAvailability() && checkDockerPostgresRunning();
  if (isDocker) {
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

// Create database if it doesn't exist (local/direct only)
async function createDatabaseIfNotExists() {
  const config = getDatabaseConfig();
  if (config.connectionString) return true; // Skip for DATABASE_URL
  try {
    const adminConfig = { ...config, database: 'postgres' };
    const adminPool = new Pool(adminConfig);
    const result = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [config.database]);
    if (result.rows.length === 0) {
      console.log(`📦 Creating database '${config.database}'...`);
      await adminPool.query(`CREATE DATABASE "${config.database}"`);
      console.log(`✅ Database '${config.database}' created successfully`);
    }
    await adminPool.end();
    return true;
  } catch (e) {
    console.error('⚠️  Could not ensure database exists:', e.message);
    return false;
  }
}

async function seedDirect() {
  // Ensure DB exists for local setups
  await createDatabaseIfNotExists();
  const pool = new Pool(getDatabaseConfig());
  const rolesSql = `
    INSERT INTO roles (name, description) VALUES
      ('business_owner', 'Business owner with access to Insights and business modules'),
      ('admin', 'Administrator with elevated privileges'),
      ('system_admin', 'System administrator with full platform control')
    ON CONFLICT (name) DO NOTHING;`;

  const permsSql = `
    INSERT INTO permissions (name, description) VALUES
      ('create', 'Create resources'),
      ('read', 'Read resources'),
      ('update', 'Update resources'),
      ('deactivate', 'Deactivate resources'),
      ('view_dashboard', 'Access user dashboard'),
      ('view_settings', 'Access settings page'),
      ('view_products', 'Access products'),
      ('view_insights', 'Access insights module'),
      ('view_admin_dashboard', 'Access admin dashboard'),
      ('view_admin_manage_users', 'Access admin manage users'),
      ('view_admin_integrations', 'Access admin integrations'),
      ('view_admin_system_health', 'Access admin system health')
    ON CONFLICT (name) DO NOTHING;`;

  try {
    await pool.query(rolesSql);
    await pool.query(permsSql);
    // Seed ONLY demo users (idempotent by email)
    await pool.query(`
      INSERT INTO users (username, fname, lname, email, password)
      SELECT 'demo_user','Demo','User','user@example.com','password123'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='user@example.com');
    `);
    await pool.query(`
      INSERT INTO users (username, fname, lname, email, password)
      SELECT 'demo_admin','Demo','Admin','admin@example.com','admin123'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='admin@example.com');
    `);
    await pool.query(`
      INSERT INTO users (username, fname, lname, email, password)
      SELECT 'demo_system_admin','Demo','SystemAdmin','system.admin@example.com','system123'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='system.admin@example.com');
    `);

    // user_roles mappings (idempotent)
    // Map demo users to roles
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.user_id, r.role_id
      FROM users u, roles r
      WHERE u.email='user@example.com' AND r.name='business_owner'
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);
    `);
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.user_id, r.role_id
      FROM users u, roles r
      WHERE u.email='admin@example.com' AND r.name='admin'
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);
    `);
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.user_id, r.role_id
      FROM users u, roles r
      WHERE u.email='system.admin@example.com' AND r.name='system_admin'
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);
    `);

    // role_permissions mappings
    // business_owner permissions (ensure products and insights access)
    const boPerms = ['view_dashboard','view_settings','view_products','view_insights','read','update'];
    for (const p of boPerms) {
      await pool.query(`
        INSERT INTO role_permissions (permission_id, role_id, permission)
        SELECT pe.permission_id, r.role_id, pe.name
        FROM permissions pe, roles r
        WHERE pe.name=$1 AND r.name='business_owner'
          AND NOT EXISTS (
            SELECT 1 FROM role_permissions rp WHERE rp.permission_id=pe.permission_id AND rp.role_id=r.role_id
          );
      `, [p]);
    }

    // admin permissions
    const adminPerms = ['view_admin_dashboard','view_admin_manage_users','view_admin_integrations','view_admin_system_health','read','update','deactivate'];
    for (const p of adminPerms) {
      await pool.query(`
        INSERT INTO role_permissions (permission_id, role_id, permission)
        SELECT pe.permission_id, r.role_id, pe.name
        FROM permissions pe, roles r
        WHERE pe.name=$1 AND r.name='admin'
          AND NOT EXISTS (
            SELECT 1 FROM role_permissions rp WHERE rp.permission_id=pe.permission_id AND rp.role_id=r.role_id
          );
      `, [p]);
    }

    // system_admin gets everything (map all permissions)
    await pool.query(`
      INSERT INTO role_permissions (permission_id, role_id, permission)
      SELECT pe.permission_id, r.role_id, pe.name
      FROM permissions pe, roles r
      WHERE r.name='system_admin'
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp WHERE rp.permission_id=pe.permission_id AND rp.role_id=r.role_id
        );
    `);

    // Placeholder products for category-focused demo users
    // Electronics
    await pool.query(`
      INSERT INTO products (owner_user_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images)
      SELECT u.user_id, '4K Smart TV 55-inch', 'ELEC-TV-55-4K', 'Ultra HD Smart TV with HDR', 'Electra', 'Electronics', 'TV & Video', 25999.00, 25, '{"color":"black","screen_size":"55-inch","resolution":"4K"}', '["https://example.com/tv1.jpg"]'::jsonb
      FROM users u WHERE u.email='electronics.owner@example.com'
      AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='ELEC-TV-55-4K');
    `);
    await pool.query(`
      INSERT INTO products (owner_user_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images)
      SELECT u.user_id, 'Noise-Cancelling Headphones', 'ELEC-HEAD-NC', 'Wireless ANC over-ear headphones', 'SonicX', 'Electronics', 'Audio', 7999.00, 100, '{"color":"silver","battery":"30h"}', '["https://example.com/headphones.jpg"]'::jsonb
      FROM users u WHERE u.email='electronics.owner@example.com'
      AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='ELEC-HEAD-NC');
    `);

    // Cosmetics
    await pool.query(`
      INSERT INTO products (owner_user_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images)
      SELECT u.user_id, 'Hydrating Serum 30ml', 'COS-SERUM-30', 'Vitamin C hydrating serum', 'GlowUp', 'Cosmetics', 'Skincare', 1299.00, 200, '{"skin_type":"all","ingredients":["vitamin C","hyaluronic acid"]}', '["https://example.com/serum.jpg"]'::jsonb
      FROM users u WHERE u.email='cosmetics.owner@example.com'
      AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='COS-SERUM-30');
    `);
    await pool.query(`
      INSERT INTO products (owner_user_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images)
      SELECT u.user_id, 'Matte Lipstick', 'COS-LIP-MATTE', 'Long-lasting matte lipstick', 'Chroma', 'Cosmetics', 'Makeup', 499.00, 300, '{"shade":"Crimson","finish":"matte"}', '["https://example.com/lipstick.jpg"]'::jsonb
      FROM users u WHERE u.email='cosmetics.owner@example.com'
      AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='COS-LIP-MATTE');
    `);

    // Food & Drinks
    await pool.query(`
      INSERT INTO products (owner_user_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images)
      SELECT u.user_id, 'Cold Brew Coffee 1L', 'FOOD-CBREW-1L', 'Ready-to-drink cold brew coffee', 'BrewLab', 'Food & Drinks', 'Beverages', 299.00, 150, '{"caffeine":"high","sugar":"none"}', '["https://example.com/coldbrew.jpg"]'::jsonb
      FROM users u WHERE u.email='food.owner@example.com'
      AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='FOOD-CBREW-1L');
    `);
    await pool.query(`
      INSERT INTO products (owner_user_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images)
      SELECT u.user_id, 'Protein Snack Bars (12-pack)', 'FOOD-PROTBAR-12', 'Assorted flavors protein bars', 'NutriBite', 'Food & Drinks', 'Snacks', 799.00, 120, '{"protein":"20g","gluten_free":true}', '["https://example.com/proteinbars.jpg"]'::jsonb
      FROM users u WHERE u.email='food.owner@example.com'
      AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='FOOD-PROTBAR-12');
    `);

    // Create accounts for demo owners (idempotent)
    await pool.query(`
      INSERT INTO accounts (owner_user_id, name, status)
      SELECT u.user_id, 'Electra Shop', 'active'
      FROM users u WHERE u.email='electronics.owner@example.com'
      AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.owner_user_id=u.user_id);
    `);
    await pool.query(`
      INSERT INTO accounts (owner_user_id, name, status)
      SELECT u.user_id, 'Cosma Beauty', 'active'
      FROM users u WHERE u.email='cosmetics.owner@example.com'
      AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.owner_user_id=u.user_id);
    `);
    await pool.query(`
      INSERT INTO accounts (owner_user_id, name, status)
      SELECT u.user_id, 'Gusto Bites', 'active'
      FROM users u WHERE u.email='food.owner@example.com'
      AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.owner_user_id=u.user_id);
    `);

    // Create one demo shop per account (idempotent)
    await pool.query(`
      INSERT INTO shops (account_id, name, platform, platform_shop_id, url, status, products_count, followers_count, following_count, chat_performance_percent, rating_value, rating_count, joined_at, metadata)
      SELECT a.account_id, 'Electra Main', 'shopee', 'SHP-ELECTRA', 'https://shopee.ph/electra', 'active', 0, 13600, 3, 96.0, 4.9, 23800, NOW() - INTERVAL '6 years', '{}'::jsonb
      FROM accounts a JOIN users u ON a.owner_user_id=u.user_id
      WHERE u.email='electronics.owner@example.com'
      AND NOT EXISTS (
        SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='shopee'
      );
    `);
    await pool.query(`
      INSERT INTO shops (account_id, name, platform, platform_shop_id, url, status, products_count, followers_count, following_count, chat_performance_percent, rating_value, rating_count, joined_at, metadata)
      SELECT a.account_id, 'Cosma Main', 'lazada', 'LZD-COSMA', 'https://www.lazada.com.ph/shop/cosma', 'active', 0, 12000, 5, 95.0, 4.8, 15000, NOW() - INTERVAL '4 years', '{}'::jsonb
      FROM accounts a JOIN users u ON a.owner_user_id=u.user_id
      WHERE u.email='cosmetics.owner@example.com'
      AND NOT EXISTS (
        SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='lazada'
      );
    `);
    await pool.query(`
      INSERT INTO shops (account_id, name, platform, platform_shop_id, url, status, products_count, followers_count, following_count, chat_performance_percent, rating_value, rating_count, joined_at, metadata)
      SELECT a.account_id, 'Gusto Main', 'tiktok', 'TT-GUSTO', 'https://www.tiktok.com/@gustobites', 'active', 0, 8000, 2, 97.0, 4.9, 9000, NOW() - INTERVAL '2 years', '{}'::jsonb
      FROM accounts a JOIN users u ON a.owner_user_id=u.user_id
      WHERE u.email='food.owner@example.com'
      AND NOT EXISTS (
        SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='tiktok'
      );
    `);

    // Add remaining platforms for each account (idempotent)
    // Electronics: Lazada + TikTok
    await pool.query(`
      INSERT INTO shops (account_id, name, platform, platform_shop_id, url, status, followers_count, metadata)
      SELECT a.account_id, 'Electra Main', 'lazada', 'LZD-ELECTRA', 'https://www.lazada.com.ph/shop/electra', 'active', 9800, '{}'::jsonb
      FROM accounts a JOIN users u ON a.owner_user_id=u.user_id
      WHERE u.email='electronics.owner@example.com'
        AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='lazada');
    `);
    await pool.query(`
      INSERT INTO shops (account_id, name, platform, platform_shop_id, url, status, followers_count, metadata)
      SELECT a.account_id, 'Electra Main', 'tiktok', 'TT-ELECTRA', 'https://www.tiktok.com/@electra', 'active', 15400, '{}'::jsonb
      FROM accounts a JOIN users u ON a.owner_user_id=u.user_id
      WHERE u.email='electronics.owner@example.com'
        AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='tiktok');
    `);
    
    // Cosmetics: Shopee + TikTok
    await pool.query(`
      INSERT INTO shops (account_id, name, platform, platform_shop_id, url, status, followers_count, metadata)
      SELECT a.account_id, 'Cosma Main', 'shopee', 'SHP-COSMA', 'https://shopee.ph/cosma', 'active', 11000, '{}'::jsonb
      FROM accounts a JOIN users u ON a.owner_user_id=u.user_id
      WHERE u.email='cosmetics.owner@example.com'
        AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='shopee');
    `);
    await pool.query(`
      INSERT INTO shops (account_id, name, platform, platform_shop_id, url, status, followers_count, metadata)
      SELECT a.account_id, 'Cosma Main', 'tiktok', 'TT-COSMA', 'https://www.tiktok.com/@cosma', 'active', 9000, '{}'::jsonb
      FROM accounts a JOIN users u ON a.owner_user_id=u.user_id
      WHERE u.email='cosmetics.owner@example.com'
        AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='tiktok');
    `);

    // Food: Shopee + Lazada
    await pool.query(`
      INSERT INTO shops (account_id, name, platform, platform_shop_id, url, status, followers_count, metadata)
      SELECT a.account_id, 'Gusto Main', 'shopee', 'SHP-GUSTO', 'https://shopee.ph/gustobites', 'active', 7000, '{}'::jsonb
      FROM accounts a JOIN users u ON a.owner_user_id=u.user_id
      WHERE u.email='food.owner@example.com'
        AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='shopee');
    `);
    await pool.query(`
      INSERT INTO shops (account_id, name, platform, platform_shop_id, url, status, followers_count, metadata)
      SELECT a.account_id, 'Gusto Main', 'lazada', 'LZD-GUSTO', 'https://www.lazada.com.ph/shop/gusto-bites', 'active', 6200, '{}'::jsonb
      FROM accounts a JOIN users u ON a.owner_user_id=u.user_id
      WHERE u.email='food.owner@example.com'
        AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='lazada');
    `);

    // Create product_listings linking products to their shop (idempotent)
    // Electronics on all platforms
    await pool.query(`
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, currency, listing_status)
      SELECT p.product_id, a.account_id, s.shop_id, 'shopee', p.sku, p.name, p.price * 0.97, 'PHP', 'active'
      FROM products p
      JOIN users u ON p.owner_user_id=u.user_id
      JOIN accounts a ON a.owner_user_id=u.user_id
      JOIN shops s ON s.account_id=a.account_id AND s.platform='shopee'
      WHERE u.email='electronics.owner@example.com'
        AND NOT EXISTS (
          SELECT 1 FROM product_listings pl WHERE pl.product_id=p.product_id AND pl.platform='shopee'
        );
    `);
    await pool.query(`
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, currency, listing_status)
      SELECT p.product_id, a.account_id, s.shop_id, 'lazada', p.sku, p.name, p.price * 1.02, 'PHP', 'active'
      FROM products p
      JOIN users u ON p.owner_user_id=u.user_id
      JOIN accounts a ON a.owner_user_id=u.user_id
      JOIN shops s ON s.account_id=a.account_id AND s.platform='lazada'
      WHERE u.email='electronics.owner@example.com'
        AND NOT EXISTS (
          SELECT 1 FROM product_listings pl WHERE pl.product_id=p.product_id AND pl.platform='lazada'
        );
    `);
    await pool.query(`
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, currency, listing_status)
      SELECT p.product_id, a.account_id, s.shop_id, 'tiktok', p.sku, p.name, p.price * 0.93, 'PHP', 'active'
      FROM products p
      JOIN users u ON p.owner_user_id=u.user_id
      JOIN accounts a ON a.owner_user_id=u.user_id
      JOIN shops s ON s.account_id=a.account_id AND s.platform='tiktok'
      WHERE u.email='electronics.owner@example.com'
        AND NOT EXISTS (
          SELECT 1 FROM product_listings pl WHERE pl.product_id=p.product_id AND pl.platform='tiktok'
        );
    `);
    // Cosmetics on all platforms
    await pool.query(`
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, currency, listing_status)
      SELECT p.product_id, a.account_id, s.shop_id, 'lazada', p.sku, p.name, p.price * 1.02, 'PHP', 'active'
      FROM products p
      JOIN users u ON p.owner_user_id=u.user_id
      JOIN accounts a ON a.owner_user_id=u.user_id
      JOIN shops s ON s.account_id=a.account_id AND s.platform='lazada'
      WHERE u.email='cosmetics.owner@example.com'
        AND NOT EXISTS (
          SELECT 1 FROM product_listings pl WHERE pl.product_id=p.product_id AND pl.platform='lazada'
        );
    `);
    await pool.query(`
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, currency, listing_status)
      SELECT p.product_id, a.account_id, s.shop_id, 'shopee', p.sku, p.name, p.price * 0.97, 'PHP', 'active'
      FROM products p
      JOIN users u ON p.owner_user_id=u.user_id
      JOIN accounts a ON a.owner_user_id=u.user_id
      JOIN shops s ON s.account_id=a.account_id AND s.platform='shopee'
      WHERE u.email='cosmetics.owner@example.com'
        AND NOT EXISTS (
          SELECT 1 FROM product_listings pl WHERE pl.product_id=p.product_id AND pl.platform='shopee'
        );
    `);
    await pool.query(`
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, currency, listing_status)
      SELECT p.product_id, a.account_id, s.shop_id, 'tiktok', p.sku, p.name, p.price * 0.93, 'PHP', 'active'
      FROM products p
      JOIN users u ON p.owner_user_id=u.user_id
      JOIN accounts a ON a.owner_user_id=u.user_id
      JOIN shops s ON s.account_id=a.account_id AND s.platform='tiktok'
      WHERE u.email='cosmetics.owner@example.com'
        AND NOT EXISTS (
          SELECT 1 FROM product_listings pl WHERE pl.product_id=p.product_id AND pl.platform='tiktok'
        );
    `);
    // Food on all platforms
    await pool.query(`
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, currency, listing_status)
      SELECT p.product_id, a.account_id, s.shop_id, 'tiktok', p.sku, p.name, p.price * 0.93, 'PHP', 'active'
      FROM products p
      JOIN users u ON p.owner_user_id=u.user_id
      JOIN accounts a ON a.owner_user_id=u.user_id
      JOIN shops s ON s.account_id=a.account_id AND s.platform='tiktok'
      WHERE u.email='food.owner@example.com'
        AND NOT EXISTS (
          SELECT 1 FROM product_listings pl WHERE pl.product_id=p.product_id AND pl.platform='tiktok'
        );
    `);
    await pool.query(`
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, currency, listing_status)
      SELECT p.product_id, a.account_id, s.shop_id, 'shopee', p.sku, p.name, p.price * 0.97, 'PHP', 'active'
      FROM products p
      JOIN users u ON p.owner_user_id=u.user_id
      JOIN accounts a ON a.owner_user_id=u.user_id
      JOIN shops s ON s.account_id=a.account_id AND s.platform='shopee'
      WHERE u.email='food.owner@example.com'
        AND NOT EXISTS (
          SELECT 1 FROM product_listings pl WHERE pl.product_id=p.product_id AND pl.platform='shopee'
        );
    `);
    await pool.query(`
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, currency, listing_status)
      SELECT p.product_id, a.account_id, s.shop_id, 'lazada', p.sku, p.name, p.price * 1.02, 'PHP', 'active'
      FROM products p
      JOIN users u ON p.owner_user_id=u.user_id
      JOIN accounts a ON a.owner_user_id=u.user_id
      JOIN shops s ON s.account_id=a.account_id AND s.platform='lazada'
      WHERE u.email='food.owner@example.com'
        AND NOT EXISTS (
          SELECT 1 FROM product_listings pl WHERE pl.product_id=p.product_id AND pl.platform='lazada'
        );
    `);
    console.log('✅ Seeded roles, permissions, users, and products via direct connection');
    await pool.end();
    return true;
  } catch (e) {
    console.error('Direct seed failed:', e.message);
    try { await pool.end(); } catch {}
    return false;
  }
}

function seedDocker() {
  console.log('🔄 Attempting to seed via Docker...');
  const rolesSql = `INSERT INTO roles (name, description) VALUES ('business_owner','Business owner with access to Insights and business modules'),('admin','Administrator with elevated privileges'),('system_admin','System administrator with full platform control') ON CONFLICT (name) DO NOTHING;`;
  const permsSql = `INSERT INTO permissions (name, description) VALUES ('create','Create resources'),('read','Read resources'),('update','Update resources'),('deactivate','Deactivate resources'),('view_dashboard','Access user dashboard'),('view_settings','Access settings page'),('view_products','Access products'),('view_insights','Access insights module'),('view_admin_dashboard','Access admin dashboard'),('view_admin_manage_users','Access admin manage users'),('view_admin_integrations','Access admin integrations'),('view_admin_system_health','Access admin system health') ON CONFLICT (name) DO NOTHING;`;
  try {
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${rolesSql}"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${permsSql}"`, { stdio: 'inherit' });
    // users (demo only)
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO users (username,fname,lname,email,password) SELECT 'demo_user','Demo','User','user@example.com','password123' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='user@example.com');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO users (username,fname,lname,email,password) SELECT 'demo_admin','Demo','Admin','admin@example.com','admin123' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='admin@example.com');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO users (username,fname,lname,email,password) SELECT 'demo_system_admin','Demo','SystemAdmin','system.admin@example.com','system123' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='system.admin@example.com');"`, { stdio: 'inherit' });
    // user_roles (demo only)
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO user_roles (user_id,role_id) SELECT u.user_id,r.role_id FROM users u, roles r WHERE u.email='user@example.com' AND r.name='business_owner' AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO user_roles (user_id,role_id) SELECT u.user_id,r.role_id FROM users u, roles r WHERE u.email='admin@example.com' AND r.name='admin' AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO user_roles (user_id,role_id) SELECT u.user_id,r.role_id FROM users u, roles r WHERE u.email='system.admin@example.com' AND r.name='system_admin' AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);"`, { stdio: 'inherit' });
    // role_permissions: business_owner
    const bo = ['view_dashboard','view_settings','view_products','view_insights','read','update'];
    for (const p of bo) {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO role_permissions (permission_id,role_id,permission) SELECT pe.permission_id,r.role_id,pe.name FROM permissions pe, roles r WHERE pe.name='${p}' AND r.name='business_owner' AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.permission_id=pe.permission_id AND rp.role_id=r.role_id);"`, { stdio: 'inherit' });
    }
    // admin
    const ad = ['view_admin_dashboard','view_admin_manage_users','view_admin_integrations','view_admin_system_health','read','update','deactivate'];
    for (const p of ad) {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO role_permissions (permission_id,role_id,permission) SELECT pe.permission_id,r.role_id,pe.name FROM permissions pe, roles r WHERE pe.name='${p}' AND r.name='admin' AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.permission_id=pe.permission_id AND rp.role_id=r.role_id);"`, { stdio: 'inherit' });
    }
    // system_admin: all perms
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO role_permissions (permission_id,role_id,permission) SELECT pe.permission_id,r.role_id,pe.name FROM permissions pe, roles r WHERE r.name='system_admin' AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.permission_id=pe.permission_id AND rp.role_id=r.role_id);"`, { stdio: 'inherit' });

    // Additional demo users (idempotent)
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO users (username,fname,lname,email,password) SELECT 'electronics_owner','Electra','Shop','electronics.owner@example.com','electra123' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='electronics.owner@example.com');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO users (username,fname,lname,email,password) SELECT 'cosmetics_owner','Cosma','Beauty','cosmetics.owner@example.com','cosma123' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='cosmetics.owner@example.com');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO users (username,fname,lname,email,password) SELECT 'food_owner','Gusto','Bites','food.owner@example.com','gusto123' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='food.owner@example.com');"`, { stdio: 'inherit' });
    // Map shop demo users to business_owner role
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO user_roles (user_id,role_id) SELECT u.user_id,r.role_id FROM users u, roles r WHERE r.name='business_owner' AND u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO user_roles (user_id,role_id) SELECT u.user_id,r.role_id FROM users u, roles r WHERE r.name='business_owner' AND u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO user_roles (user_id,role_id) SELECT u.user_id,r.role_id FROM users u, roles r WHERE r.name='business_owner' AND u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);"`, { stdio: 'inherit' });

    // Placeholder products for those users (idempotent)
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images) SELECT u.user_id,'4K Smart TV 55-inch','ELEC-TV-55-4K','Ultra HD Smart TV with HDR','Electra','Electronics','TV & Video',25999.00,25,'{\\\"color\\\":\\\"black\\\",\\\"screen_size\\\":\\\"55-inch\\\",\\\"resolution\\\":\\\"4K\\\"}'::jsonb,'[\\\"https://example.com/tv1.jpg\\\"]'::jsonb FROM users u WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='ELEC-TV-55-4K');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images) SELECT u.user_id,'Noise-Cancelling Headphones','ELEC-HEAD-NC','Wireless ANC over-ear headphones','SonicX','Electronics','Audio',7999.00,100,'{\\\"color\\\":\\\"silver\\\",\\\"battery\\\":\\\"30h\\\"}'::jsonb,'[\\\"https://example.com/headphones.jpg\\\"]'::jsonb FROM users u WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='ELEC-HEAD-NC');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images) SELECT u.user_id,'Hydrating Serum 30ml','COS-SERUM-30','Vitamin C hydrating serum','GlowUp','Cosmetics','Skincare',1299.00,200,'{\\\"skin_type\\\":\\\"all\\\",\\\"ingredients\\\":[\\\"vitamin C\\\",\\\"hyaluronic acid\\\"]}'::jsonb,'[\\\"https://example.com/serum.jpg\\\"]'::jsonb FROM users u WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='COS-SERUM-30');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images) SELECT u.user_id,'Matte Lipstick','COS-LIP-MATTE','Long-lasting matte lipstick','Chroma','Cosmetics','Makeup',499.00,300,'{\\\"shade\\\":\\\"Crimson\\\",\\\"finish\\\":\\\"matte\\\"}'::jsonb,'[\\\"https://example.com/lipstick.jpg\\\"]'::jsonb FROM users u WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='COS-LIP-MATTE');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images) SELECT u.user_id,'Cold Brew Coffee 1L','FOOD-CBREW-1L','Ready-to-drink cold brew coffee','BrewLab','Food & Drinks','Beverages',299.00,150,'{\\\"caffeine\\\":\\\"high\\\",\\\"sugar\\\":\\\"none\\\"}'::jsonb,'[\\\"https://example.com/coldbrew.jpg\\\"]'::jsonb FROM users u WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='FOOD-CBREW-1L');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images) SELECT u.user_id,'Protein Snack Bars (12-pack)','FOOD-PROTBAR-12','Assorted flavors protein bars','NutriBite','Food & Drinks','Snacks',799.00,120,'{\\\"protein\\\":\\\"20g\\\",\\\"gluten_free\\\":true}'::jsonb,'[\\\"https://example.com/proteinbars.jpg\\\"]'::jsonb FROM users u WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='FOOD-PROTBAR-12');"`, { stdio: 'inherit' });
    // Accounts for demo owners
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO accounts (owner_user_id,name,status) SELECT u.user_id,'Electra Shop','active' FROM users u WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.owner_user_id=u.user_id);"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO accounts (owner_user_id,name,status) SELECT u.user_id,'Cosma Beauty','active' FROM users u WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.owner_user_id=u.user_id);"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO accounts (owner_user_id,name,status) SELECT u.user_id,'Gusto Bites','active' FROM users u WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.owner_user_id=u.user_id);"`, { stdio: 'inherit' });

    // Shops per account
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,products_count,followers_count,following_count,chat_performance_percent,rating_value,rating_count,joined_at,metadata) SELECT a.account_id,'Electra Main','shopee','SHP-ELECTRA','https://shopee.ph/electra','active',0,13600,3,96.0,4.9,23800,NOW() - INTERVAL '6 years','{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='shopee');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,products_count,followers_count,following_count,chat_performance_percent,rating_value,rating_count,joined_at,metadata) SELECT a.account_id,'Cosma Main','lazada','LZD-COSMA','https://www.lazada.com.ph/shop/cosma','active',0,12000,5,95.0,4.8,15000,NOW() - INTERVAL '4 years','{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='lazada');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,products_count,followers_count,following_count,chat_performance_percent,rating_value,rating_count,joined_at,metadata) SELECT a.account_id,'Gusto Main','tiktok','TT-GUSTO','https://www.tiktok.com/@gustobites','active',0,8000,2,97.0,4.9,9000,NOW() - INTERVAL '2 years','{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='tiktok');"`, { stdio: 'inherit' });

    // Additional shops with varied followers
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,followers_count,metadata) SELECT a.account_id,'Electra Main','lazada','LZD-ELECTRA','https://www.lazada.com.ph/shop/electra','active',9800,'{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='lazada');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,followers_count,metadata) SELECT a.account_id,'Electra Main','tiktok','TT-ELECTRA','https://www.tiktok.com/@electra','active',15400,'{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='tiktok');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,followers_count,metadata) SELECT a.account_id,'Cosma Main','shopee','SHP-COSMA','https://shopee.ph/cosma','active',11000,'{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='shopee');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,followers_count,metadata) SELECT a.account_id,'Cosma Main','tiktok','TT-COSMA','https://www.tiktok.com/@cosma','active',9000,'{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='tiktok');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,followers_count,metadata) SELECT a.account_id,'Gusto Main','shopee','SHP-GUSTO','https://shopee.ph/gustobites','active',7000,'{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='shopee');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,followers_count,metadata) SELECT a.account_id,'Gusto Main','lazada','LZD-GUSTO','https://www.lazada.com.ph/shop/gusto-bites','active',6200,'{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='lazada');"`, { stdio: 'inherit' });

    // Product listings linking
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO product_listings (product_id,account_id,shop_id,platform,platform_product_id,title,listing_price,currency,listing_status) SELECT p.product_id,a.account_id,s.shop_id,'shopee',p.sku,p.name,p.price*0.97,'PHP','active' FROM products p JOIN users u ON p.owner_user_id=u.user_id JOIN accounts a ON a.owner_user_id=u.user_id JOIN shops s ON s.account_id=a.account_id AND s.platform='shopee' WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM product_listings pl WHERE pl.product_id=p.product_id AND pl.platform='shopee');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO product_listings (product_id,account_id,shop_id,platform,platform_product_id,title,listing_price,currency,listing_status) SELECT p.product_id,a.account_id,s.shop_id,'lazada',p.sku,p.name,p.price*1.02,'PHP','active' FROM products p JOIN users u ON p.owner_user_id=u.user_id JOIN accounts a ON a.owner_user_id=u.user_id JOIN shops s ON s.account_id=a.account_id AND s.platform='lazada' WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM product_listings pl WHERE pl.product_id=p.product_id AND pl.platform='lazada');"`, { stdio: 'inherit' });
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO product_listings (product_id,account_id,shop_id,platform,platform_product_id,title,listing_price,currency,listing_status) SELECT p.product_id,a.account_id,s.shop_id,'tiktok',p.sku,p.name,p.price*0.93,'PHP','active' FROM products p JOIN users u ON p.owner_user_id=u.user_id JOIN accounts a ON a.owner_user_id=u.user_id JOIN shops s ON s.account_id=a.account_id AND s.platform='tiktok' WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM product_listings pl WHERE pl.product_id=p.product_id AND pl.platform='tiktok');"`, { stdio: 'inherit' });

    console.log('✅ Seeded roles, permissions, users, products, accounts, shops, and listings via Docker');
    return true;
  } catch (e) { console.error('Docker seed failed:', e.message); return false; }
}

async function main() {
  console.log('Seeding roles and permissions...');
  const okDirect = await seedDirect();
  // Always attempt Docker as well, to keep both targets in sync when available
  const okDocker = seedDocker();
  if (!okDirect && !okDocker) process.exitCode = 1;
}

main();


