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
    // Electronics - 15 products
    const electronicsProducts = [
      { sku: 'ELEC-TV-55-4K', name: '4K Smart TV 55-inch', price: 25999.00, stock: 25, brand: 'Electra', category: 'TV & Video' },
      { sku: 'ELEC-HEAD-NC', name: 'Noise-Cancelling Headphones', price: 7999.00, stock: 100, brand: 'SonicX', category: 'Audio' },
      { sku: 'ELEC-PHONE-128', name: 'Smartphone 128GB', price: 15999.00, stock: 50, brand: 'TechCore', category: 'Mobile' },
      { sku: 'ELEC-LAPTOP-16', name: 'Gaming Laptop 16GB RAM', price: 45999.00, stock: 15, brand: 'GameMax', category: 'Computers' },
      { sku: 'ELEC-TABLET-10', name: '10-inch Tablet', price: 12999.00, stock: 75, brand: 'TabPro', category: 'Tablets' },
      { sku: 'ELEC-SPEAKER-BT', name: 'Bluetooth Speaker', price: 2999.00, stock: 200, brand: 'SoundWave', category: 'Audio' },
      { sku: 'ELEC-CAMERA-4K', name: '4K Action Camera', price: 8999.00, stock: 60, brand: 'ActionCam', category: 'Cameras' },
      { sku: 'ELEC-SMARTWATCH', name: 'Smart Watch Pro', price: 5999.00, stock: 120, brand: 'WearTech', category: 'Wearables' },
      { sku: 'ELEC-CHARGER-WIRELESS', name: 'Wireless Charger', price: 1999.00, stock: 300, brand: 'ChargeMax', category: 'Accessories' },
      { sku: 'ELEC-KEYBOARD-MECH', name: 'Mechanical Keyboard', price: 3999.00, stock: 80, brand: 'KeyMaster', category: 'Accessories' },
      { sku: 'ELEC-MOUSE-GAMING', name: 'Gaming Mouse RGB', price: 2499.00, stock: 150, brand: 'GameGear', category: 'Accessories' },
      { sku: 'ELEC-MONITOR-27', name: '27-inch Gaming Monitor', price: 18999.00, stock: 30, brand: 'DisplayPro', category: 'Monitors' },
      { sku: 'ELEC-WEBCAM-4K', name: '4K Webcam Pro', price: 6999.00, stock: 90, brand: 'StreamCam', category: 'Accessories' },
      { sku: 'ELEC-ROUTER-WIFI6', name: 'WiFi 6 Router', price: 12999.00, stock: 40, brand: 'NetMax', category: 'Networking' },
      { sku: 'ELEC-POWERBANK-20K', name: '20,000mAh Power Bank', price: 3499.00, stock: 180, brand: 'PowerMax', category: 'Accessories' }
    ];

    for (const product of electronicsProducts) {
      try {
        // First get the user_id and account_id
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['electronics.owner@example.com']);
        if (userResult.rows.length === 0) {
          console.error('Electronics owner not found');
          continue;
        }
        const userId = userResult.rows[0].user_id;

        // Get the account_id for this user
        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) {
          console.error('Electronics account not found');
          continue;
        }
        const accountId = accountResult.rows[0].account_id;

        // Check if product already exists
        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) {
          continue; // Skip if already exists
        }

        // Insert the product with account_id
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, 'Electronics', $7, $8, $9, '{"color":"black","warranty":"1 year"}', $10::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - High quality ${product.category.toLowerCase()}`, product.brand, product.category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Cosmetics - 15 products
    const cosmeticsProducts = [
      { sku: 'COS-SERUM-30', name: 'Hydrating Serum 30ml', price: 1299.00, stock: 200, brand: 'GlowUp', category: 'Skincare' },
      { sku: 'COS-LIP-MATTE', name: 'Matte Lipstick', price: 499.00, stock: 300, brand: 'Chroma', category: 'Makeup' },
      { sku: 'COS-FOUNDATION-30', name: 'Full Coverage Foundation', price: 899.00, stock: 150, brand: 'BeautyBase', category: 'Makeup' },
      { sku: 'COS-MASCARA-VOL', name: 'Volumizing Mascara', price: 599.00, stock: 250, brand: 'LashPro', category: 'Makeup' },
      { sku: 'COS-CLEANSER-GEL', name: 'Gentle Gel Cleanser', price: 699.00, stock: 180, brand: 'PureSkin', category: 'Skincare' },
      { sku: 'COS-MOISTURIZER-50', name: 'Anti-Aging Moisturizer', price: 1499.00, stock: 120, brand: 'AgeDefy', category: 'Skincare' },
      { sku: 'COS-EYESHADOW-PAL', name: 'Eyeshadow Palette', price: 1299.00, stock: 100, brand: 'ColorPop', category: 'Makeup' },
      { sku: 'COS-SUNSCREEN-SPF50', name: 'SPF 50 Sunscreen', price: 799.00, stock: 200, brand: 'SunGuard', category: 'Skincare' },
      { sku: 'COS-CONCEALER-FULL', name: 'Full Coverage Concealer', price: 649.00, stock: 175, brand: 'HideIt', category: 'Makeup' },
      { sku: 'COS-TONER-200', name: 'Hydrating Toner', price: 549.00, stock: 160, brand: 'Refresh', category: 'Skincare' },
      { sku: 'COS-LIPGLOSS-SHINE', name: 'Shiny Lip Gloss', price: 399.00, stock: 220, brand: 'Glossy', category: 'Makeup' },
      { sku: 'COS-FACEMASK-5PACK', name: 'Hydrating Face Mask 5-pack', price: 999.00, stock: 80, brand: 'MaskCare', category: 'Skincare' },
      { sku: 'COS-BLUSH-PINK', name: 'Pink Blush Compact', price: 749.00, stock: 140, brand: 'Cheeky', category: 'Makeup' },
      { sku: 'COS-EYELINER-WING', name: 'Winged Eyeliner Pen', price: 449.00, stock: 190, brand: 'WingMaster', category: 'Makeup' },
      { sku: 'COS-EXFOLIATOR-SCRUB', name: 'Gentle Exfoliating Scrub', price: 899.00, stock: 110, brand: 'SmoothSkin', category: 'Skincare' }
    ];

    for (const product of cosmeticsProducts) {
      try {
        // First get the user_id and account_id
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['cosmetics.owner@example.com']);
        if (userResult.rows.length === 0) {
          console.error('Cosmetics owner not found');
          continue;
        }
        const userId = userResult.rows[0].user_id;

        // Get the account_id for this user
        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) {
          console.error('Cosmetics account not found');
          continue;
        }
        const accountId = accountResult.rows[0].account_id;

        // Check if product already exists
        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) {
          continue; // Skip if already exists
        }

        // Insert the product with account_id
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, 'Cosmetics', $7, $8, $9, '{"skin_type":"all","cruelty_free":true}', $10::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Premium ${product.category.toLowerCase()}`, product.brand, product.category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Food & Drinks - 15 products
    const foodProducts = [
      { sku: 'FOOD-CBREW-1L', name: 'Cold Brew Coffee 1L', price: 299.00, stock: 150, brand: 'BrewLab', category: 'Beverages' },
      { sku: 'FOOD-PROTBAR-12', name: 'Protein Snack Bars (12-pack)', price: 799.00, stock: 120, brand: 'NutriBite', category: 'Snacks' },
      { sku: 'FOOD-GRANOLA-500G', name: 'Organic Granola 500g', price: 449.00, stock: 200, brand: 'NatureCrunch', category: 'Breakfast' },
      { sku: 'FOOD-SMOOTHIE-MIX', name: 'Superfood Smoothie Mix', price: 599.00, stock: 100, brand: 'GreenBoost', category: 'Supplements' },
      { sku: 'FOOD-CHOCOLATE-DARK', name: 'Dark Chocolate 70%', price: 349.00, stock: 300, brand: 'CocoaPure', category: 'Confectionery' },
      { sku: 'FOOD-NUTS-MIXED', name: 'Mixed Nuts 250g', price: 399.00, stock: 180, brand: 'NuttyGood', category: 'Snacks' },
      { sku: 'FOOD-TEA-GREEN', name: 'Green Tea Bags (50-pack)', price: 249.00, stock: 250, brand: 'TeaLeaf', category: 'Beverages' },
      { sku: 'FOOD-HONEY-RAW', name: 'Raw Honey 500g', price: 699.00, stock: 80, brand: 'BeePure', category: 'Sweeteners' },
      { sku: 'FOOD-CRACKERS-SEED', name: 'Seed Crackers 200g', price: 299.00, stock: 150, brand: 'CrispySeed', category: 'Snacks' },
      { sku: 'FOOD-JUICE-ORGANIC', name: 'Organic Apple Juice 1L', price: 199.00, stock: 200, brand: 'FruitFresh', category: 'Beverages' },
      { sku: 'FOOD-SPICE-MIX', name: 'Gourmet Spice Mix Set', price: 899.00, stock: 60, brand: 'SpiceMaster', category: 'Seasonings' },
      { sku: 'FOOD-CEREAL-HEALTHY', name: 'Healthy Cereal 500g', price: 549.00, stock: 120, brand: 'GrainGood', category: 'Breakfast' },
      { sku: 'FOOD-ENERGY-DRINK', name: 'Natural Energy Drink', price: 149.00, stock: 300, brand: 'EnergyBoost', category: 'Beverages' },
      { sku: 'FOOD-DRIED-FRUIT', name: 'Mixed Dried Fruit 300g', price: 399.00, stock: 160, brand: 'FruitMix', category: 'Snacks' },
      { sku: 'FOOD-SUPERFOOD-POWDER', name: 'Superfood Powder 200g', price: 1299.00, stock: 70, brand: 'SuperNutrients', category: 'Supplements' }
    ];

    for (const product of foodProducts) {
      try {
        // First get the user_id and account_id
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['food.owner@example.com']);
        if (userResult.rows.length === 0) {
          console.error('Food owner not found');
          continue;
        }
        const userId = userResult.rows[0].user_id;

        // Get the account_id for this user
        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) {
          console.error('Food account not found');
          continue;
        }
        const accountId = accountResult.rows[0].account_id;

        // Check if product already exists
        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) {
          continue; // Skip if already exists
        }

        // Insert the product with account_id
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, 'Food & Drinks', $7, $8, $9, '{"organic":true,"gluten_free":true}', $10::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Premium ${product.category.toLowerCase()}`, product.brand, product.category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

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

    // Seed product sales data from October 5 to November 5, 2025
    const startDate = new Date('2025-10-05');
    const endDate = new Date('2025-11-05');
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Generate realistic product sales for each business owner
      const businessOwners = [
        { email: 'electronics.owner@example.com', platforms: ['shopee', 'lazada', 'tiktok'], dailySalesRange: [5000, 15000] },
        { email: 'cosmetics.owner@example.com', platforms: ['shopee', 'lazada', 'tiktok'], dailySalesRange: [3000, 10000] },
        { email: 'food.owner@example.com', platforms: ['shopee', 'lazada', 'tiktok'], dailySalesRange: [2000, 8000] }
      ];

      for (const owner of businessOwners) {
        // Get products for this owner
        const products = await pool.query(`
          SELECT p.product_id, p.price, a.account_id, s.shop_id, s.platform
          FROM products p
          JOIN users u ON p.owner_user_id = u.user_id
          JOIN accounts a ON a.owner_user_id = u.user_id
          JOIN shops s ON s.account_id = a.account_id
          WHERE u.email = $1
        `, [owner.email]);

        if (products.rows.length > 0) {
          // Generate 5-15 sales per day for this owner
          const numSales = Math.floor(Math.random() * 11) + 5; // 5-15 sales
          
          for (let i = 0; i < numSales; i++) {
            const randomProduct = products.rows[Math.floor(Math.random() * products.rows.length)];
            const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
            const unitPrice = randomProduct.price * (0.9 + Math.random() * 0.2); // ±10% price variation
            const totalSales = unitPrice * quantity;

            await pool.query(`
              INSERT INTO product_sales (account_id, product_id, shop_id, platform, sale_date, quantity_sold, unit_price, total_sales, order_id)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              randomProduct.account_id,
              randomProduct.product_id,
              randomProduct.shop_id,
              randomProduct.platform,
              dateStr,
              quantity,
              unitPrice,
              totalSales,
              `ORD-${dateStr.replace(/-/g, '')}-${Math.floor(Math.random() * 10000)}`
            ]);
          }
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Now aggregate the product sales into daily_sales_aggregated
    try {
      await pool.query(`
        INSERT INTO daily_sales_aggregated (account_id, sale_date, total_sales, total_orders, platform_breakdown)
        SELECT 
          account_id,
          sale_date,
          SUM(platform_total) as total_sales,
          COUNT(DISTINCT order_id) as total_orders,
          jsonb_object_agg(platform, platform_total)
        FROM (
          SELECT 
            account_id,
            sale_date,
            platform,
            SUM(total_sales) as platform_total,
            order_id
          FROM product_sales
          GROUP BY account_id, sale_date, platform, order_id
        ) platform_sales
        GROUP BY account_id, sale_date
        ON CONFLICT (account_id, sale_date) DO UPDATE SET
          total_sales = EXCLUDED.total_sales,
          total_orders = EXCLUDED.total_orders,
          platform_breakdown = EXCLUDED.platform_breakdown,
          updated_at = CURRENT_TIMESTAMP;
      `);
    } catch (error) {
      console.error('Error aggregating daily sales:', error.message);
      // Continue with the rest of the seeding even if aggregation fails
    }

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

    // Electronics products (15 total)
    const electronicsDockerProducts = [
      { sku: 'ELEC-TV-55-4K', name: '4K Smart TV 55-inch', price: 25999.00, stock: 25, brand: 'Electra', category: 'TV & Video' },
      { sku: 'ELEC-HEAD-NC', name: 'Noise-Cancelling Headphones', price: 7999.00, stock: 100, brand: 'SonicX', category: 'Audio' },
      { sku: 'ELEC-PHONE-128', name: 'Smartphone 128GB', price: 15999.00, stock: 50, brand: 'TechCore', category: 'Mobile' },
      { sku: 'ELEC-LAPTOP-16', name: 'Gaming Laptop 16GB RAM', price: 45999.00, stock: 15, brand: 'GameMax', category: 'Computers' },
      { sku: 'ELEC-TABLET-10', name: '10-inch Tablet', price: 12999.00, stock: 75, brand: 'TabPro', category: 'Tablets' },
      { sku: 'ELEC-SPEAKER-BT', name: 'Bluetooth Speaker', price: 2999.00, stock: 200, brand: 'SoundWave', category: 'Audio' },
      { sku: 'ELEC-CAMERA-4K', name: '4K Action Camera', price: 8999.00, stock: 60, brand: 'ActionCam', category: 'Cameras' },
      { sku: 'ELEC-SMARTWATCH', name: 'Smart Watch Pro', price: 5999.00, stock: 120, brand: 'WearTech', category: 'Wearables' },
      { sku: 'ELEC-CHARGER-WIRELESS', name: 'Wireless Charger', price: 1999.00, stock: 300, brand: 'ChargeMax', category: 'Accessories' },
      { sku: 'ELEC-KEYBOARD-MECH', name: 'Mechanical Keyboard', price: 3999.00, stock: 80, brand: 'KeyMaster', category: 'Accessories' },
      { sku: 'ELEC-MOUSE-GAMING', name: 'Gaming Mouse RGB', price: 2499.00, stock: 150, brand: 'GameGear', category: 'Accessories' },
      { sku: 'ELEC-MONITOR-27', name: '27-inch Gaming Monitor', price: 18999.00, stock: 30, brand: 'DisplayPro', category: 'Monitors' },
      { sku: 'ELEC-WEBCAM-4K', name: '4K Webcam Pro', price: 6999.00, stock: 90, brand: 'StreamCam', category: 'Accessories' },
      { sku: 'ELEC-ROUTER-WIFI6', name: 'WiFi 6 Router', price: 12999.00, stock: 40, brand: 'NetMax', category: 'Networking' },
      { sku: 'ELEC-POWERBANK-20K', name: '20,000mAh Power Bank', price: 3499.00, stock: 180, brand: 'PowerMax', category: 'Accessories' }
    ];

    for (const product of electronicsDockerProducts) {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images) SELECT u.user_id,'${product.name}','${product.sku}','${product.name} - High quality ${product.category.toLowerCase()}','${product.brand}','Electronics','${product.category}',${product.price},${product.stock},'{\\\"color\\\":\\\"black\\\",\\\"warranty\\\":\\\"1 year\\\"}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb FROM users u WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }
    // Cosmetics products (15 total)
    const cosmeticsDockerProducts = [
      { sku: 'COS-SERUM-30', name: 'Hydrating Serum 30ml', price: 1299.00, stock: 200, brand: 'GlowUp', category: 'Skincare' },
      { sku: 'COS-LIP-MATTE', name: 'Matte Lipstick', price: 499.00, stock: 300, brand: 'Chroma', category: 'Makeup' },
      { sku: 'COS-FOUNDATION-30', name: 'Full Coverage Foundation', price: 899.00, stock: 150, brand: 'BeautyBase', category: 'Makeup' },
      { sku: 'COS-MASCARA-VOL', name: 'Volumizing Mascara', price: 599.00, stock: 250, brand: 'LashPro', category: 'Makeup' },
      { sku: 'COS-CLEANSER-GEL', name: 'Gentle Gel Cleanser', price: 699.00, stock: 180, brand: 'PureSkin', category: 'Skincare' },
      { sku: 'COS-MOISTURIZER-50', name: 'Anti-Aging Moisturizer', price: 1499.00, stock: 120, brand: 'AgeDefy', category: 'Skincare' },
      { sku: 'COS-EYESHADOW-PAL', name: 'Eyeshadow Palette', price: 1299.00, stock: 100, brand: 'ColorPop', category: 'Makeup' },
      { sku: 'COS-SUNSCREEN-SPF50', name: 'SPF 50 Sunscreen', price: 799.00, stock: 200, brand: 'SunGuard', category: 'Skincare' },
      { sku: 'COS-CONCEALER-FULL', name: 'Full Coverage Concealer', price: 649.00, stock: 175, brand: 'HideIt', category: 'Makeup' },
      { sku: 'COS-TONER-200', name: 'Hydrating Toner', price: 549.00, stock: 160, brand: 'Refresh', category: 'Skincare' },
      { sku: 'COS-LIPGLOSS-SHINE', name: 'Shiny Lip Gloss', price: 399.00, stock: 220, brand: 'Glossy', category: 'Makeup' },
      { sku: 'COS-FACEMASK-5PACK', name: 'Hydrating Face Mask 5-pack', price: 999.00, stock: 80, brand: 'MaskCare', category: 'Skincare' },
      { sku: 'COS-BLUSH-PINK', name: 'Pink Blush Compact', price: 749.00, stock: 140, brand: 'Cheeky', category: 'Makeup' },
      { sku: 'COS-EYELINER-WING', name: 'Winged Eyeliner Pen', price: 449.00, stock: 190, brand: 'WingMaster', category: 'Makeup' },
      { sku: 'COS-EXFOLIATOR-SCRUB', name: 'Gentle Exfoliating Scrub', price: 899.00, stock: 110, brand: 'SmoothSkin', category: 'Skincare' }
    ];

    for (const product of cosmeticsDockerProducts) {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images) SELECT u.user_id,'${product.name}','${product.sku}','${product.name} - Premium ${product.category.toLowerCase()}','${product.brand}','Cosmetics','${product.category}',${product.price},${product.stock},'{\\\"skin_type\\\":\\\"all\\\",\\\"cruelty_free\\\":true}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb FROM users u WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Food & Drinks products (15 total)
    const foodDockerProducts = [
      { sku: 'FOOD-CBREW-1L', name: 'Cold Brew Coffee 1L', price: 299.00, stock: 150, brand: 'BrewLab', category: 'Beverages' },
      { sku: 'FOOD-PROTBAR-12', name: 'Protein Snack Bars (12-pack)', price: 799.00, stock: 120, brand: 'NutriBite', category: 'Snacks' },
      { sku: 'FOOD-GRANOLA-500G', name: 'Organic Granola 500g', price: 449.00, stock: 200, brand: 'NatureCrunch', category: 'Breakfast' },
      { sku: 'FOOD-SMOOTHIE-MIX', name: 'Superfood Smoothie Mix', price: 599.00, stock: 100, brand: 'GreenBoost', category: 'Supplements' },
      { sku: 'FOOD-CHOCOLATE-DARK', name: 'Dark Chocolate 70%', price: 349.00, stock: 300, brand: 'CocoaPure', category: 'Confectionery' },
      { sku: 'FOOD-NUTS-MIXED', name: 'Mixed Nuts 250g', price: 399.00, stock: 180, brand: 'NuttyGood', category: 'Snacks' },
      { sku: 'FOOD-TEA-GREEN', name: 'Green Tea Bags (50-pack)', price: 249.00, stock: 250, brand: 'TeaLeaf', category: 'Beverages' },
      { sku: 'FOOD-HONEY-RAW', name: 'Raw Honey 500g', price: 699.00, stock: 80, brand: 'BeePure', category: 'Sweeteners' },
      { sku: 'FOOD-CRACKERS-SEED', name: 'Seed Crackers 200g', price: 299.00, stock: 150, brand: 'CrispySeed', category: 'Snacks' },
      { sku: 'FOOD-JUICE-ORGANIC', name: 'Organic Apple Juice 1L', price: 199.00, stock: 200, brand: 'FruitFresh', category: 'Beverages' },
      { sku: 'FOOD-SPICE-MIX', name: 'Gourmet Spice Mix Set', price: 899.00, stock: 60, brand: 'SpiceMaster', category: 'Seasonings' },
      { sku: 'FOOD-CEREAL-HEALTHY', name: 'Healthy Cereal 500g', price: 549.00, stock: 120, brand: 'GrainGood', category: 'Breakfast' },
      { sku: 'FOOD-ENERGY-DRINK', name: 'Natural Energy Drink', price: 149.00, stock: 300, brand: 'EnergyBoost', category: 'Beverages' },
      { sku: 'FOOD-DRIED-FRUIT', name: 'Mixed Dried Fruit 300g', price: 399.00, stock: 160, brand: 'FruitMix', category: 'Snacks' },
      { sku: 'FOOD-SUPERFOOD-POWDER', name: 'Superfood Powder 200g', price: 1299.00, stock: 70, brand: 'SuperNutrients', category: 'Supplements' }
    ];

    for (const product of foodDockerProducts) {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images) SELECT u.user_id,'${product.name}','${product.sku}','${product.name} - Premium ${product.category.toLowerCase()}','${product.brand}','Food & Drinks','${product.category}',${product.price},${product.stock},'{\\\"organic\\\":true,\\\"gluten_free\\\":true}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb FROM users u WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }
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

    // Note: Docker seeding doesn't include sales data aggregation
    // The direct seeding (Railway) handles the complete data setup

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


