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

function getDockerContainerName() {
  try {
    const out = execSync('docker ps --filter "name=postgres" --format "{{.Names}}"', { encoding: 'utf8' });
    const containers = out.trim().split('\n').filter(name => name.includes('postgres') || name.includes('datadrip'));
    return containers.length > 0 ? containers[0] : '${containerName}';
  } catch { 
    return '${containerName}'; 
  }
}

function getDockerPort() {
  // Check if we're using the dev compose (port 5433) or production (port 5432)
  const port = process.env.DB_PORT || '5432';
  return port === '5433' ? '5433' : '5432';
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
    
    // Category demo users (idempotent)
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
    
    // Map category users to business_owner role
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.user_id, r.role_id
      FROM users u, roles r
      WHERE u.email='electronics.owner@example.com' AND r.name='business_owner'
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);
    `);
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.user_id, r.role_id
      FROM users u, roles r
      WHERE u.email='cosmetics.owner@example.com' AND r.name='business_owner'
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);
    `);
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.user_id, r.role_id
      FROM users u, roles r
      WHERE u.email='food.owner@example.com' AND r.name='business_owner'
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

    // Create accounts for demo owners FIRST (before products)
    console.log('Creating accounts...');
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
    console.log('✅ Accounts created');

    // ==================== ELECTRA SHOP PRODUCTS ====================
    // Electronics - 15 products
    const electronicsProducts = [
      { sku: 'ELEC-TV-55-4K', name: '4K Smart TV 55-inch', price: 25999.00, stock: 25, brand: 'Electra', sub_category: 'TV & Video', product_type: 'Smart TV' },
      { sku: 'ELEC-HEAD-NC', name: 'Noise-Cancelling Headphones', price: 7999.00, stock: 100, brand: 'SonicX',  sub_category: 'Audio', product_type: 'Headphones' },
      { sku: 'ELEC-PHONE-128', name: 'Smartphone 128GB', price: 15999.00, stock: 50, brand: 'TechCore', sub_category: 'Mobile', product_type: 'Smartphone' },
      { sku: 'ELEC-LAPTOP-16', name: 'Gaming Laptop 16GB RAM', price: 45999.00, stock: 15, brand: 'GameMax', sub_category: 'Computers', product_type: 'Laptop' },
      { sku: 'ELEC-TABLET-10', name: '10-inch Tablet', price: 12999.00, stock: 75, brand: 'TabPro', sub_category: 'Tablets', product_type: 'Tablet' },
      { sku: 'ELEC-SPEAKER-BT', name: 'Bluetooth Speaker', price: 2999.00, stock: 200, brand: 'SoundWave', sub_category: 'Audio', product_type: 'Speaker' },
      { sku: 'ELEC-CAMERA-4K', name: '4K Action Camera', price: 8999.00, stock: 60, brand: 'ActionCam', sub_category: 'Cameras', product_type: 'Action Camera' },
      { sku: 'ELEC-SMARTWATCH', name: 'Smart Watch Pro', price: 5999.00, stock: 120, brand: 'WearTech', sub_category: 'Wearables', product_type: 'Smart Watch' },
      { sku: 'ELEC-CHARGER-WIRELESS', name: 'Wireless Charger', price: 1999.00, stock: 300, brand: 'ChargeMax', sub_category: 'Accessories', product_type: 'Wireless Charger' },
      { sku: 'ELEC-ROUTER-WIFI6', name: 'WiFi 6 Router', price: 12999.00, stock: 40, brand: 'NetMax', sub_category: 'Networking', product_type: 'Router' },
      { sku: 'ELEC-POWERBANK-20K', name: '20,000mAh Power Bank', price: 3499.00, stock: 180, brand: 'PowerMax', sub_category: 'Accessories', product_type: 'Power Bank' },
      { sku: 'ELEC-EARBUDS-PRO', name: 'Wireless Earbuds Pro', price: 4999.00, stock: 150, brand: 'AudioTech', sub_category: 'Audio', product_type: 'Wireless Earbuds' },
      { sku: 'ELEC-PROJECTOR-FHD', name: 'Full HD Projector', price: 19999.00, stock: 30, brand: 'ProjectorPro', sub_category: 'TV & Video', product_type: 'Projector' },
    ];

    for (const product of electronicsProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['electronics.owner@example.com']);
        if (userResult.rows.length === 0) {
          console.error('Electronics owner not found');
          continue;
        }
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) {
          console.error('Electronics account not found');
          continue;
        }
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) {
          continue;
        }

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"color":"black","warranty":"1 year"}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - High quality ${product.sub_category.toLowerCase()}`, product.brand, 'Electronics', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Appliances - 12 products
    const appliancesProducts = [
      { sku: 'APPL-FRIDGE-2D', name: 'Two-Door Refrigerator 14cuft', price: 18999.00, stock: 20, brand: 'CoolMax', sub_category: 'Kitchen', product_type: 'Refrigerator' },
      { sku: 'APPL-MICROWAVE-30L', name: 'Microwave Oven 30L', price: 5999.00, stock: 40, brand: 'HeatWave', sub_category: 'Kitchen', sub_category: 'Microwave Oven' },
      { sku: 'APPL-WASHER-AUTO', name: 'Automatic Washing Machine 8kg', price: 15999.00, stock: 25, brand: 'CleanCycle', sub_category: 'Laundry', product_type: 'Washing Machine' },
      { sku: 'APPL-AIRCOND-1HP', name: 'Air Conditioner 1HP', price: 22999.00, stock: 30, brand: 'CoolAir', sub_category: 'Climate', product_type: 'Air Conditioner' },
      { sku: 'APPL-RICE-COOKER', name: 'Digital Rice Cooker 1.8L', price: 2999.00, stock: 80, brand: 'RicePro', sub_category: 'Kitchen', product_type: 'Rice Cooker' },
      { sku: 'APPL-BLENDER-1000W', name: 'High-Power Blender 1000W', price: 3499.00, stock: 60, brand: 'BlendMaster', sub_category: 'Kitchen', product_type: 'Blender' },
      { sku: 'APPL-IRON-STEAM', name: 'Steam Iron 2000W', price: 1999.00, stock: 100, brand: 'PressRight', sub_category: 'Laundry', product_type: 'Steam Iron' },
      { sku: 'APPL-FAN-STAND', name: 'Stand Fan 16-inch', price: 1499.00, stock: 150, brand: 'AirFlow', sub_category: 'Climate', product_type: 'Stand Fan' },
      { sku: 'APPL-VACUUM-CORDLESS', name: 'Cordless Vacuum Cleaner', price: 8999.00, stock: 45, brand: 'CleanSweep', sub_category: 'Cleaning', product_type: 'Cordless Vacuum Cleaner' },
      { sku: 'APPL-TOASTER-4SLICE', name: '4-Slice Toaster', price: 2499.00, stock: 70, brand: 'ToastMaster', sub_category: 'Kitchen', product_type: 'Toaster' },
      { sku: 'APPL-KETTLE-ELEC', name: 'Electric Kettle 1.7L', price: 1299.00, stock: 120, brand: 'BoilFast', sub_category: 'Kitchen', product_type: 'Electric Kettle' },
      { sku: 'APPL-AIRFRYER-5L', name: 'Air Fryer 5L Capacity', price: 4999.00, stock: 55, brand: 'CrispyCook', sub_category: 'Kitchen', product_type: 'Air Fryer' }
    ];

    for (const product of appliancesProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['electronics.owner@example.com']);
        if (userResult.rows.length === 0) continue;
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) continue;
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) continue;

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"energy_rating":"A+","warranty":"2 years"}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Efficient ${product.sub_category.toLowerCase()} appliance`, product.brand, 'Appliances', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Peripherals - 12 products
    const peripheralsProducts = [
      { sku: 'PERI-KEYBOARD-MECH', name: 'Mechanical Keyboard RGB', price: 3999.00, stock: 80, brand: 'KeyMaster', sub_category: 'Input Devices', product_type: 'Mechanical Keyboard' },
      { sku: 'PERI-MOUSE-GAMING', name: 'Gaming Mouse RGB', price: 2499.00, stock: 150, brand: 'GameGear', sub_category: 'Input Devices', product_type: 'Gaming Mouse' },
      { sku: 'PERI-WEBCAM-4K', name: '4K Webcam Pro', price: 6999.00, stock: 90, brand: 'StreamCam', sub_category: 'Video', product_type: 'Webcam' },
      { sku: 'PERI-HEADSET-USB', name: 'USB Gaming Headset', price: 4499.00, stock: 100, brand: 'AudioGame', sub_category: 'Audio', product_type: 'USB Gaming Headset' },
      { sku: 'PERI-MONITOR-27', name: '27-inch Gaming Monitor 144Hz', price: 18999.00, stock: 30, brand: 'DisplayPro', sub_category: 'Display', product_type: 'Gaming Monitor' },
      { sku: 'PERI-MOUSEPAD-XXL', name: 'XXL Gaming Mouse Pad', price: 999.00, stock: 200, brand: 'DeskMat', sub_category: 'Accessories', product_type: 'Gaming Mouse Pad' },
      { sku: 'PERI-USB-HUB-7PORT', name: '7-Port USB Hub', price: 1499.00, stock: 120, brand: 'ConnectPlus', sub_category: 'Connectivity', product_type: 'USB Hub' },
      { sku: 'PERI-CABLE-HDMI', name: 'HDMI Cable 2m 4K', price: 599.00, stock: 300, brand: 'CablePro', sub_category: 'Cables', product_type: 'HDMI Cable' },
      { sku: 'PERI-MIC-STREAMING', name: 'USB Streaming Microphone', price: 5999.00, stock: 60, brand: 'VoiceClear', sub_category: 'Audio', product_type: 'USB Streaming Microphone' },
      { sku: 'PERI-DOCK-LAPTOP', name: 'Laptop Docking Station', price: 7999.00, stock: 40, brand: 'DockMaster', sub_category: 'Connectivity', product_type: 'Laptop Docking Station' },
      { sku: 'PERI-COOLER-LAPTOP', name: 'Laptop Cooling Pad RGB', price: 1999.00, stock: 110, brand: 'CoolLap', sub_category: 'Cooling', product_type: 'Laptop Cooling Pad' },
      { sku: 'PERI-ADAPTER-USBC', name: 'USB-C Multi Adapter', price: 1299.00, stock: 180, brand: 'AdaptAll', sub_category: 'Connectivity', product_type: 'USB-C Multi Adapter' }
    ];

    for (const product of peripheralsProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['electronics.owner@example.com']);
        if (userResult.rows.length === 0) continue;
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) continue;
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) continue;

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"plug_and_play":true,"warranty":"1 year"}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Professional ${product.sub_category.toLowerCase()}`, product.brand, 'Peripherals', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Computer Components - 12 products
    const componentsProducts = [
      { sku: 'COMP-RAM-16GB', name: 'DDR4 RAM 16GB 3200MHz', price: 3999.00, stock: 80, brand: 'MemoryPro', sub_category: 'Memory', product_type: 'RAM' },
      { sku: 'COMP-SSD-1TB', name: 'NVMe SSD 1TB M.2', price: 5999.00, stock: 60, brand: 'SpeedDrive', sub_category: 'Storage', product_type: 'SSD' },
      { sku: 'COMP-GPU-RTX', name: 'Graphics Card RTX 6GB', price: 35999.00, stock: 15, brand: 'GraphicMax', sub_category: 'Graphics', product_type: 'Graphics Card' },
      { sku: 'COMP-CPU-I5', name: 'Intel i5 Processor 12th Gen', price: 12999.00, stock: 30, brand: 'IntelCore', sub_category: 'Processors', product_type: 'Processor' },
      { sku: 'COMP-MOBO-B550', name: 'B550 Motherboard ATX', price: 8999.00, stock: 25, brand: 'BoardMaster', sub_category: 'Motherboards', product_type: 'Motherboard' },
      { sku: 'COMP-PSU-750W', name: 'Power Supply 750W Modular', price: 6499.00, stock: 40, brand: 'PowerTech', sub_category: 'Power', product_type: 'Power Supply' },
      { sku: 'COMP-CASE-ATX', name: 'ATX Gaming Case RGB', price: 4999.00, stock: 35, brand: 'CasePro', sub_category: 'Cases', product_type: 'Gaming Case' },
      { sku: 'COMP-COOLER-CPU', name: 'CPU Cooler RGB Tower', price: 2999.00, stock: 50, brand: 'CoolCPU', sub_category: 'Cooling', product_type: 'CPU Cooler' },
      { sku: 'COMP-HDD-2TB', name: 'Hard Drive 2TB 7200RPM', price: 3499.00, stock: 70, brand: 'DataStore', sub_category: 'Storage', product_type: 'Hard Drive' },
      { sku: 'COMP-THERMAL-PASTE', name: 'Thermal Paste Premium', price: 499.00, stock: 150, brand: 'CoolPaste', sub_category: 'Accessories', product_type: 'Thermal Paste' },
      { sku: 'COMP-FAN-CASE-RGB', name: 'RGB Case Fan 120mm 3-Pack', price: 1999.00, stock: 90, brand: 'AirRGB', sub_category: 'Cooling', product_type: 'Case Fan' },
      { sku: 'COMP-CABLE-SATA', name: 'SATA Cable 3-Pack', price: 399.00, stock: 200, brand: 'CableConnect', sub_category: 'Accessories', product_type: 'SATA Cable' }
    ];

    for (const product of componentsProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['electronics.owner@example.com']);
        if (userResult.rows.length === 0) continue;
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) continue;
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) continue;

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"compatible":"PC","warranty":"3 years"}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - High-performance ${product.sub_category.toLowerCase()}`, product.brand, 'Computer Components', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Gaming - 12 products
    const gamingProducts = [
      { sku: 'GAME-CONSOLE-PS5', name: 'Gaming Console PS5', price: 28999.00, stock: 20, brand: 'PlayStation', sub_category: 'Consoles', product_type: 'Gaming Console' },
      { sku: 'GAME-CONTROLLER-XBOX', name: 'Wireless Controller Xbox', price: 3499.00, stock: 80, brand: 'Xbox', sub_category: 'Controllers', product_type: 'Wireless Controller' },
      { sku: 'GAME-CHAIR-RACING', name: 'Gaming Chair Racing Style', price: 12999.00, stock: 25, brand: 'SeatComfort', sub_category: 'Furniture', product_type: 'Gaming Chair' },
      { sku: 'GAME-DESK-RGB', name: 'Gaming Desk with RGB', price: 15999.00, stock: 15, brand: 'DeskGamer', sub_category: 'Furniture', product_type: 'Gaming Desk' },
      { sku: 'GAME-HEADSET-7.1', name: '7.1 Surround Gaming Headset', price: 5999.00, stock: 60, brand: 'SoundGame', sub_category: 'Audio', product_type: 'Gaming Headset' },
      { sku: 'GAME-KEYBOARD-TKL', name: 'TKL Mechanical Gaming Keyboard', price: 4499.00, stock: 50, brand: 'GameKeys', sub_category: 'Peripherals', product_type: 'Mechanical Keyboard' },
      { sku: 'GAME-MOUSE-ULTRA', name: 'Ultra-Light Gaming Mouse', price: 2999.00, stock: 90, brand: 'MousePro', sub_category: 'Peripherals', product_type: 'Gaming Mouse' },
      { sku: 'GAME-CAPTURE-CARD', name: 'Game Capture Card 4K60', price: 9999.00, stock: 30, brand: 'StreamCapture', sub_category: 'Streaming', product_type: 'Capture Card' },
      { sku: 'GAME-STEERING-WHEEL', name: 'Racing Wheel with Pedals', price: 18999.00, stock: 20, brand: 'RaceSim', sub_category: 'Controllers', product_type: 'Racing Wheel' },
      { sku: 'GAME-VR-HEADSET', name: 'VR Gaming Headset', price: 24999.00, stock: 18, brand: 'VirtualReality', sub_category: 'VR', product_type: 'VR Headset' },
      { sku: 'GAME-LED-STRIP', name: 'LED Strip Lights RGB 5m', price: 1299.00, stock: 150, brand: 'LightSetup', sub_category: 'Lighting', product_type: 'LED Strip' },
      { sku: 'GAME-CONTROLLER-FIGHT', name: 'Fight Stick Arcade Controller', price: 7999.00, stock: 35, brand: 'FightPro', sub_category: 'Controllers', product_type: 'Fight Stick' }
    ];

    for (const product of gamingProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['electronics.owner@example.com']);
        if (userResult.rows.length === 0) continue;
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) continue;
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) continue;

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"gaming_grade":"pro","warranty":"1 year"}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Pro-level ${product.sub_category.toLowerCase()}`, product.brand, 'Gaming', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // ==================== COSMA BEAUTY SHOP PRODUCTS ====================
    // Cosmetics - 15 products
    const cosmeticsProducts = [
      { sku: 'COS-LIP-MATTE', name: 'Matte Lipstick', price: 499.00, stock: 300, brand: 'Chroma', sub_category: 'Makeup', product_type: 'Lipstick' },
      { sku: 'COS-FOUNDATION-30', name: 'Full Coverage Foundation', price: 899.00, stock: 150, brand: 'BeautyBase', sub_category: 'Makeup', product_type: 'Foundation' },
      { sku: 'COS-MASCARA-VOL', name: 'Volumizing Mascara', price: 599.00, stock: 250, brand: 'LashPro', sub_category: 'Makeup', product_type: 'Mascara' },
      { sku: 'COS-EYESHADOW-PAL', name: 'Eyeshadow Palette', price: 1299.00, stock: 100, brand: 'ColorPop', sub_category: 'Makeup', product_type: 'Eyeshadow' },
      { sku: 'COS-CONCEALER-FULL', name: 'Full Coverage Concealer', price: 649.00, stock: 175, brand: 'HideIt', sub_category: 'Makeup', product_type: 'Concealer' },
      { sku: 'COS-LIPGLOSS-SHINE', name: 'Shiny Lip Gloss', price: 399.00, stock: 220, brand: 'Glossy', sub_category: 'Makeup', product_type: 'Lip Gloss' },
      { sku: 'COS-BLUSH-PINK', name: 'Pink Blush Compact', price: 749.00, stock: 140, brand: 'Cheeky', sub_category: 'Makeup', product_type: 'Blush' },
      { sku: 'COS-EYELINER-WING', name: 'Winged Eyeliner Pen', price: 449.00, stock: 190, brand: 'WingMaster', sub_category: 'Makeup', product_type: 'Eyeliner' },
      { sku: 'COS-POWDER-SET', name: 'Setting Powder Translucent', price: 799.00, stock: 130, brand: 'SetPro', sub_category: 'Makeup', product_type: 'Setting Powder' },
      { sku: 'COS-PRIMER-FACE', name: 'Face Primer Smoothing', price: 899.00, stock: 110, brand: 'PrimePerfect', sub_category: 'Makeup', product_type: 'Primer' },
      { sku: 'COS-BRONZER-CONT', name: 'Bronzer Contour Palette', price: 1099.00, stock: 90, brand: 'Sculpt', sub_category: 'Makeup', product_type: 'Bronzer' },
      { sku: 'COS-BROW-KIT', name: 'Eyebrow Kit with Brush', price: 699.00, stock: 160, brand: 'BrowPro', sub_category: 'Makeup', product_type: 'Eyebrow Kit' },
      { sku: 'COS-LIPLINER-SET', name: 'Lip Liner Set 5 Colors', price: 899.00, stock: 120, brand: 'LineMaster', sub_category: 'Makeup', product_type: 'Lip Liner' },
      { sku: 'COS-HIGHLIGHT-GLOW', name: 'Highlighter Glow Palette', price: 999.00, stock: 100, brand: 'ShineOn', sub_category: 'Makeup', product_type: 'Highlighter' },
      { sku: 'COS-MAKEUP-REMOVER', name: 'Makeup Remover Wipes 50pc', price: 349.00, stock: 250, brand: 'CleanOff', sub_category: 'Makeup', product_type: 'Makeup Remover' }
    ];

    for (const product of cosmeticsProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['cosmetics.owner@example.com']);
        if (userResult.rows.length === 0) {
          console.error('Cosmetics owner not found');
          continue;
        }
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) {
          console.error('Cosmetics account not found');
          continue;
        }
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) {
          continue;
        }

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"skin_type":"all","cruelty_free":true}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Premium ${product.sub_category.toLowerCase()}`, product.brand, 'Cosmetics', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Skincare - 12 products
    const skincareProducts = [
      { sku: 'SKIN-SERUM-30', name: 'Hydrating Serum 30ml', price: 1299.00, stock: 200, brand: 'GlowUp', sub_category: 'Serums', product_type: 'Hydrating Serum' },
      { sku: 'SKIN-CLEANSER-GEL', name: 'Gentle Gel Cleanser', price: 699.00, stock: 180, brand: 'PureSkin', sub_category: 'Cleansers', product_type: 'Gel Cleanser' },
      { sku: 'SKIN-MOISTURIZER-50', name: 'Anti-Aging Moisturizer', price: 1499.00, stock: 120, brand: 'AgeDefy', sub_category: 'Moisturizers', product_type: 'Anti-Aging Moisturizer' },
      { sku: 'SKIN-SUNSCREEN-SPF50', name: 'SPF 50 Sunscreen', price: 799.00, stock: 200, brand: 'SunGuard', sub_category: 'Sun Protection', product_type: 'Sunscreen' },
      { sku: 'SKIN-TONER-200', name: 'Hydrating Toner', price: 549.00, stock: 160, brand: 'Refresh', sub_category: 'Toners', product_type: 'Hydrating Toner' },
      { sku: 'SKIN-FACEMASK-5PACK', name: 'Hydrating Face Mask 5-pack', price: 999.00, stock: 80, brand: 'MaskCare', sub_category: 'Masks', product_type: 'Face Mask' },
      { sku: 'SKIN-EXFOLIATOR-SCRUB', name: 'Gentle Exfoliating Scrub', price: 899.00, stock: 110, brand: 'SmoothSkin', sub_category: 'Exfoliators', product_type: 'Exfoliating Scrub' },
      { sku: 'SKIN-EYECREAM-15ML', name: 'Anti-Aging Eye Cream', price: 1199.00, stock: 90, brand: 'EyeCare', sub_category: 'Eye Care', product_type: 'Eye Cream' },
      { sku: 'SKIN-ESSENCE-100ML', name: 'Brightening Essence', price: 1399.00, stock: 100, brand: 'Bright', sub_category: 'Essences', product_type: 'Brightening Essence' },
      { sku: 'SKIN-MICELLAR-400ML', name: 'Micellar Water 400ml', price: 599.00, stock: 150, brand: 'ClearWater', sub_category: 'Cleansers', product_type: 'Micellar Water' },
      { sku: 'SKIN-VITAMIN-C', name: 'Vitamin C Serum 30ml', price: 1599.00, stock: 80, brand: 'VitaGlow', sub_category: 'Serums', product_type: 'Vitamin C Serum' },
      { sku: 'SKIN-RETINOL-NIGHT', name: 'Retinol Night Cream', price: 1799.00, stock: 70, brand: 'RetinolPro', sub_category: 'Night Care', product_type: 'Retinol Cream' }
    ];

    for (const product of skincareProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['cosmetics.owner@example.com']);
        if (userResult.rows.length === 0) continue;
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) continue;
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) continue;

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"dermatologist_tested":true,"hypoallergenic":true}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Advanced ${product.sub_category.toLowerCase()}`, product.brand, 'Skincare', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Fashion - 12 products
    const fashionProducts = [
      { sku: 'FASH-TSHIRT-M', name: 'Cotton T-Shirt Medium', price: 299.00, stock: 500, brand: 'StyleHub', sub_category: 'Clothing', product_type: 'T-Shirt' },
      { sku: 'FASH-JEANS-32', name: 'Denim Jeans Size 32', price: 1299.00, stock: 200, brand: 'DenimCo', sub_category: 'Clothing', product_type: 'Jeans' },
      { sku: 'FASH-DRESS-S', name: 'Summer Dress Small', price: 899.00, stock: 150, brand: 'ChicWear', sub_category: 'Clothing', product_type: 'Dress' },
      { sku: 'FASH-SNEAKERS-9', name: 'Running Sneakers Size 9', price: 2499.00, stock: 120, brand: 'SportyFeet', sub_category: 'Footwear', product_type: 'Sneakers' },
      { sku: 'FASH-HANDBAG', name: 'Leather Handbag', price: 1899.00, stock: 80, brand: 'LuxBags', sub_category: 'Accessories', product_type: 'Handbag' },
      { sku: 'FASH-SUNGLASSES', name: 'Polarized Sunglasses', price: 699.00, stock: 250, brand: 'SunStyle', sub_category: 'Accessories', product_type: 'Sunglasses' },
      { sku: 'FASH-WATCH-M', name: 'Analog Wrist Watch', price: 3499.00, stock: 60, brand: 'TimeKeep', sub_category: 'Accessories', product_type: 'Watch' },
      { sku: 'FASH-BELT-L', name: 'Leather Belt Large', price: 499.00, stock: 300, brand: 'BeltCraft', sub_category: 'Accessories', product_type: 'Belt' },
      { sku: 'FASH-HAT-CAP', name: 'Baseball Cap', price: 349.00, stock: 400, brand: 'CapMaster', sub_category: 'Accessories', product_type: 'Cap' },
      { sku: 'FASH-JACKET-XL', name: 'Windbreaker Jacket XL', price: 1999.00, stock: 90, brand: 'OutdoorWear', sub_category: 'Outerwear', product_type: 'Jacket' },
      { sku: 'FASH-SCARF', name: 'Wool Scarf', price: 599.00, stock: 180, brand: 'WarmKnit', sub_category: 'Accessories', product_type: 'Scarf' },
      { sku: 'FASH-SOCKS-3PACK', name: 'Cotton Socks 3-Pack', price: 199.00, stock: 600, brand: 'ComfyFeet', sub_category: 'Clothing', product_type: 'Socks' }
    ];

    for (const product of fashionProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['cosmetics.owner@example.com']);
        if (userResult.rows.length === 0) continue;
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) continue;
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) continue;

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"material":"quality","size_range":"various"}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Trendy ${product.sub_category.toLowerCase()}`, product.brand, 'Fashion', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Home & Living - 12 products
    const homeProducts = [
      { sku: 'HOME-PILLOW-2', name: 'Memory Foam Pillow 2-Pack', price: 999.00, stock: 100, brand: 'ComfortHome', sub_category: 'Bedding', product_type: 'Pillow' },
      { sku: 'HOME-BLANKET-Q', name: 'Queen Size Blanket', price: 1499.00, stock: 80, brand: 'WarmLiving', sub_category: 'Bedding', product_type: 'Blanket' },
      { sku: 'HOME-LAMP-LED', name: 'LED Desk Lamp', price: 799.00, stock: 150, brand: 'BrightSpace', sub_category: 'Lighting', product_type: 'Desk Lamp' },
      { sku: 'HOME-CURTAIN-SET', name: 'Blackout Curtains Set', price: 1299.00, stock: 70, brand: 'WindowStyle', sub_category: 'Decor', product_type: 'Curtains' },
      { sku: 'HOME-VASE-CERAMIC', name: 'Ceramic Flower Vase', price: 599.00, stock: 120, brand: 'ArtDecor', sub_category: 'Decor', product_type: 'Vase' },
      { sku: 'HOME-RUG-6X9', name: 'Area Rug 6x9 feet', price: 2999.00, stock: 50, brand: 'FloorCraft', sub_category: 'Flooring', product_type: 'Area Rug' },
      { sku: 'HOME-TOWEL-6PACK', name: 'Bath Towel 6-Pack', price: 899.00, stock: 200, brand: 'SoftTouch', sub_category: 'Bathroom', product_type: 'Bath Towel' },
      { sku: 'HOME-ORGANIZER', name: 'Storage Organizer', price: 699.00, stock: 180, brand: 'TidySpace', sub_category: 'Storage', product_type: 'Storage Organizer' },
      { sku: 'HOME-MIRROR-WALL', name: 'Wall Mirror Large', price: 1899.00, stock: 60, brand: 'ReflectStyle', sub_category: 'Decor', product_type: 'Wall Mirror' },
      { sku: 'HOME-CLOCK-WALL', name: 'Modern Wall Clock', price: 499.00, stock: 220, brand: 'TimeDecor', sub_category: 'Decor', product_type: 'Wall Clock' },
      { sku: 'HOME-CANDLE-SET', name: 'Scented Candle Set', price: 799.00, stock: 140, brand: 'AromaBliss', sub_category: 'Decor', product_type: 'Candles' },
      { sku: 'HOME-PLANT-POT', name: 'Ceramic Plant Pot', price: 399.00, stock: 300, brand: 'GreenSpace', sub_category: 'Garden', product_type: 'Plant Pot' }
    ];

    for (const product of homeProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['cosmetics.owner@example.com']);
        if (userResult.rows.length === 0) continue;
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) continue;
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) continue;

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"eco_friendly":true,"durable":true}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Quality ${product.sub_category.toLowerCase()}`, product.brand, 'Home & Living', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Hair Care - 12 products
    const haircareProducts = [
      { sku: 'HAIR-SHAMPOO-HYDRA', name: 'Hydrating Shampoo 500ml', price: 699.00, stock: 150, brand: 'LuxHair', sub_category: 'Shampoos', product_type: 'Shampoo' },
      { sku: 'HAIR-CONDITIONER-SMOOTH', name: 'Smoothing Conditioner 500ml', price: 699.00, stock: 140, brand: 'LuxHair', sub_category: 'Conditioners', product_type: 'Conditioner' },
      { sku: 'HAIR-OIL-ARGAN', name: 'Argan Hair Oil 100ml', price: 999.00, stock: 100, brand: 'OilPure', sub_category: 'Treatments', product_type: 'Hair Oil' },
      { sku: 'HAIR-MASK-REPAIR', name: 'Repairing Hair Mask 300ml', price: 899.00, stock: 80, brand: 'RepairPro', sub_category: 'Masks', product_type: 'Hair Mask' },
      { sku: 'HAIR-SERUM-SHINE', name: 'Shine Serum 50ml', price: 799.00, stock: 120, brand: 'GlossyHair', sub_category: 'Serums', product_type: 'Hair Serum' },
      { sku: 'HAIR-SPRAY-HOLD', name: 'Strong Hold Hair Spray', price: 599.00, stock: 180, brand: 'StyleFix', sub_category: 'Styling', product_type: 'Hair Spray' },
      { sku: 'HAIR-GEL-STYLING', name: 'Styling Gel 200ml', price: 499.00, stock: 200, brand: 'HoldFast', sub_category: 'Styling', product_type: 'Styling Gel' },
      { sku: 'HAIR-FOAM-VOLUME', name: 'Volumizing Foam 150ml', price: 699.00, stock: 110, brand: 'VolumePro', sub_category: 'Styling', product_type: 'Volumizing Foam' },
      { sku: 'HAIR-TREATMENT-KERATIN', name: 'Keratin Treatment 250ml', price: 1499.00, stock: 60, brand: 'KeratinCare', sub_category: 'Treatments', product_type: 'Keratin Treatment' },
      { sku: 'HAIR-DRYER-IONIC', name: 'Ionic Hair Dryer 2000W', price: 2999.00, stock: 50, brand: 'DryCare', sub_category: 'Tools', product_type: 'Hair Dryer' },
      { sku: 'HAIR-BRUSH-DETANGLE', name: 'Detangling Brush', price: 399.00, stock: 250, brand: 'BrushEase', sub_category: 'Accessories', product_type: 'Hair Brush' },
      { sku: 'HAIR-STRAIGHTENER-PRO', name: 'Pro Hair Straightener', price: 3499.00, stock: 40, brand: 'StraightLine', sub_category: 'Tools', product_type: 'Hair Straightener' }
    ];

    for (const product of haircareProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['cosmetics.owner@example.com']);
        if (userResult.rows.length === 0) continue;
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) continue;
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) continue;

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"sulfate_free":true,"paraben_free":true}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Professional ${product.sub_category.toLowerCase()}`, product.brand, 'Hair Care', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Fragrances - 12 products
    const fragranceProducts = [
      { sku: 'FRAG-PERFUME-FLORAL', name: 'Floral Eau de Parfum 50ml', price: 2999.00, stock: 60, brand: 'ScentLux', sub_category: 'Perfumes', product_type: 'Eau de Parfum' },
      { sku: 'FRAG-COLOGNE-FRESH', name: 'Fresh Cologne 100ml', price: 2499.00, stock: 70, brand: 'FreshScent', sub_category: 'Colognes', product_type: 'Cologne' },
      { sku: 'FRAG-BODYSPRAY-CITRUS', name: 'Citrus Body Spray 200ml', price: 599.00, stock: 200, brand: 'SprayFresh', sub_category: 'Body Sprays', product_type: 'Body Spray' },
      { sku: 'FRAG-PERFUME-WOODY', name: 'Woody Eau de Toilette 75ml', price: 2799.00, stock: 50, brand: 'WoodNotes', sub_category: 'Perfumes', product_type: 'Eau de Toilette' },
      { sku: 'FRAG-DIFFUSER-LAVENDER', name: 'Lavender Reed Diffuser', price: 999.00, stock: 120, brand: 'AromaHome', sub_category: 'Home Fragrances', product_type: 'Reed Diffuser' },
      { sku: 'FRAG-CANDLE-VANILLA', name: 'Vanilla Scented Candle', price: 799.00, stock: 150, brand: 'CandleGlow', sub_category: 'Home Fragrances', product_type: 'Scented Candle' },
      { sku: 'FRAG-MIST-ROSE', name: 'Rose Body Mist 250ml', price: 699.00, stock: 180, brand: 'MistCare', sub_category: 'Body Mists', product_type: 'Body Mist' },
      { sku: 'FRAG-OIL-ESSENTIAL', name: 'Essential Oil Set 10pc', price: 1299.00, stock: 90, brand: 'PureEssence', sub_category: 'Essential Oils', product_type: 'Essential Oil Set' },
      { sku: 'FRAG-SPRAY-AIR', name: 'Air Freshener Spray', price: 399.00, stock: 250, brand: 'FreshAir', sub_category: 'Home Fragrances', product_type: 'Air Freshener' },
      { sku: 'FRAG-LOTION-SCENTED', name: 'Scented Body Lotion 200ml', price: 899.00, stock: 140, brand: 'SoftSmell', sub_category: 'Body Care', product_type: 'Body Lotion' },
      { sku: 'FRAG-SACHET-CLOSET', name: 'Closet Sachet 5-Pack', price: 499.00, stock: 200, brand: 'FreshSpace', sub_category: 'Home Fragrances', product_type: 'Sachet' },
      { sku: 'FRAG-ROLLER-TRAVEL', name: 'Travel Perfume Roller 10ml', price: 799.00, stock: 110, brand: 'TravelScent', sub_category: 'Perfumes', product_type: 'Perfume Roller' }
    ];

    for (const product of fragranceProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['cosmetics.owner@example.com']);
        if (userResult.rows.length === 0) continue;
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) continue;
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) continue;

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"long_lasting":true,"allergen_free":false}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Luxurious ${product.sub_category.toLowerCase()}`, product.brand, 'Fragrances', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // ==================== GUSTO BITES SHOP PRODUCTS ====================
    // Food - 8 products
    const foodProducts = [
      { sku: 'FOOD-GRANOLA-500G', name: 'Organic Granola 500g', price: 449.00, stock: 200, brand: 'NatureCrunch', sub_category: 'Breakfast', product_type: 'Granola' },
      { sku: 'FOOD-CHOCOLATE-DARK', name: 'Dark Chocolate 70%', price: 349.00, stock: 300, brand: 'CocoaPure', sub_category: 'Confectionery', product_type: 'Dark Chocolate' },
      { sku: 'FOOD-HONEY-RAW', name: 'Raw Honey 500g', price: 699.00, stock: 80, brand: 'BeePure', sub_category: 'Sweeteners', product_type: 'Raw Honey' },
      { sku: 'FOOD-DRIED-FRUIT', name: 'Mixed Dried Fruit 300g', price: 399.00, stock: 160, brand: 'FruitMix', sub_category: 'Snacks', product_type: 'Dried Fruit' },
      { sku: 'FOOD-CEREAL-HEALTHY', name: 'Healthy Cereal 500g', price: 549.00, stock: 120, brand: 'GrainGood', sub_category: 'Breakfast', product_type: 'Cereal' },
      { sku: 'FOOD-PASTA-WHOLE', name: 'Whole Wheat Pasta 500g', price: 299.00, stock: 180, brand: 'PastaPro', sub_category: 'Pantry', product_type: 'Pasta' },
      { sku: 'FOOD-RICE-ORGANIC', name: 'Organic Brown Rice 2kg', price: 599.00, stock: 100, brand: 'GrainPure', sub_category: 'Pantry', product_type: 'Rice' },
      { sku: 'FOOD-OATS-ROLLED', name: 'Rolled Oats 1kg', price: 399.00, stock: 150, brand: 'OatGood', sub_category: 'Breakfast', product_type: 'Oats' }
    ];

    for (const product of foodProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['food.owner@example.com']);
        if (userResult.rows.length === 0) {
          console.error('Food owner not found');
          continue;
        }
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) {
          console.error('Food account not found');
          continue;
        }
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) {
          continue;
        }

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"organic":true,"gluten_free":false}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Premium ${product.sub_category.toLowerCase()}`, product.brand, 'Food', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Drinks - 7 products
    const drinksProducts = [
      { sku: 'DRINK-CBREW-1L', name: 'Cold Brew Coffee 1L', price: 299.00, stock: 150, brand: 'BrewLab', sub_category: 'Beverages', product_type: 'Coffee' },
      { sku: 'DRINK-TEA-GREEN', name: 'Green Tea Bags (50-pack)', price: 249.00, stock: 250, brand: 'TeaLeaf', sub_category: 'Beverages', product_type: 'Tea' },
      { sku: 'DRINK-JUICE-ORGANIC', name: 'Organic Apple Juice 1L', price: 199.00, stock: 200, brand: 'FruitFresh', sub_category: 'Beverages', product_type: 'Juice' },
      { sku: 'DRINK-ENERGY-NATURAL', name: 'Natural Energy Drink', price: 149.00, stock: 300, brand: 'EnergyBoost', sub_category: 'Beverages', product_type: 'Energy Drink' },
      { sku: 'DRINK-SMOOTHIE-MIX', name: 'Superfood Smoothie Mix', price: 599.00, stock: 100, brand: 'GreenBoost', sub_category: 'Beverages', product_type: 'Smoothie Mix' },
      { sku: 'DRINK-WATER-SPARKLING', name: 'Sparkling Water 6-Pack', price: 299.00, stock: 180, brand: 'BubbleWater', sub_category: 'Beverages', product_type: 'Sparkling Water' },
      { sku: 'DRINK-MILK-ALMOND', name: 'Almond Milk 1L', price: 249.00, stock: 140, brand: 'NutMilk', sub_category: 'Beverages', product_type: 'Plant Milk' }
    ];

    for (const product of drinksProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['food.owner@example.com']);
        if (userResult.rows.length === 0) continue;
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) continue;
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) continue;

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"sugar_free":false,"natural":true}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Refreshing ${product.sub_category.toLowerCase()}`, product.brand, 'Drinks', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Snacks - 12 products
    const snacksProducts = [
      { sku: 'SNACK-CHIPS-BBQ', name: 'BBQ Potato Chips 200g', price: 149.00, stock: 400, brand: 'CrunchyBite', sub_category: 'Chips', product_type: 'Potato Chips' },
      { sku: 'SNACK-POPCORN-BUTTER', name: 'Butter Popcorn 150g', price: 129.00, stock: 350, brand: 'PopCrunch', sub_category: 'Popcorn', product_type: 'Popcorn' },
      { sku: 'SNACK-COOKIES-CHOCO', name: 'Chocolate Chip Cookies 250g', price: 199.00, stock: 300, brand: 'BakeJoy', sub_category: 'Cookies', product_type: 'Cookies' },
      { sku: 'SNACK-PRETZELS-SALT', name: 'Salted Pretzels 200g', price: 169.00, stock: 280, brand: 'TwistSnack', sub_category: 'Pretzels', product_type: 'Pretzels' },
      { sku: 'SNACK-TRAIL-MIX', name: 'Trail Mix Deluxe 300g', price: 349.00, stock: 200, brand: 'NuttyTrail', sub_category: 'Mixed Snacks', product_type: 'Trail Mix' },
      { sku: 'SNACK-CRACKERS-CHEESE', name: 'Cheese Crackers 180g', price: 159.00, stock: 320, brand: 'CrunchCheese', sub_category: 'Crackers', product_type: 'Crackers' },
      { sku: 'SNACK-JERKY-BEEF', name: 'Beef Jerky 100g', price: 299.00, stock: 150, brand: 'MeatSnack', sub_category: 'Protein Snacks', product_type: 'Beef Jerky' },
      { sku: 'SNACK-GRANOLA-BAR', name: 'Granola Bars 6-Pack', price: 249.00, stock: 250, brand: 'HealthyBite', sub_category: 'Bars', product_type: 'Granola Bar' },
      { sku: 'SNACK-CANDY-GUMMY', name: 'Gummy Bears 250g', price: 179.00, stock: 380, brand: 'SweetGummy', sub_category: 'Candy', product_type: 'Gummy Candy' },
      { sku: 'SNACK-WAFER-HAZELNUT', name: 'Hazelnut Wafer 150g', price: 149.00, stock: 290, brand: 'WaferCrisp', sub_category: 'Wafers', product_type: 'Wafer' },
      { sku: 'SNACK-NUTS-CASHEW', name: 'Roasted Cashews 200g', price: 399.00, stock: 160, brand: 'NuttyPremium', sub_category: 'Nuts', product_type: 'Cashews' },
      { sku: 'SNACK-RICE-CAKE', name: 'Rice Cakes 10-Pack', price: 99.00, stock: 420, brand: 'LightBite', sub_category: 'Rice Snacks', product_type: 'Rice Cake' }
    ];

    for (const product of snacksProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['food.owner@example.com']);
        if (userResult.rows.length === 0) continue;
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) continue;
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) continue;

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"preservative_free":false,"tasty":true}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Delicious ${product.sub_category.toLowerCase()}`, product.brand, 'Snacks', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Condiments & Sauces - 12 products
    const condimentsProducts = [
      { sku: 'COND-KETCHUP-500ML', name: 'Tomato Ketchup 500ml', price: 149.00, stock: 280, brand: 'TomatoKing', sub_category: 'Sauces', product_type: 'Ketchup' },
      { sku: 'COND-SOY-SAUCE', name: 'Premium Soy Sauce 250ml', price: 199.00, stock: 250, brand: 'SoyMaster', sub_category: 'Sauces', product_type: 'Soy Sauce' },
      { sku: 'COND-MAYO-400ML', name: 'Mayonnaise 400ml', price: 179.00, stock: 300, brand: 'CreamySpread', sub_category: 'Spreads', product_type: 'Mayonnaise' },
      { sku: 'COND-HOT-SAUCE', name: 'Hot Chili Sauce 150ml', price: 129.00, stock: 220, brand: 'SpicyKick', sub_category: 'Hot Sauces', product_type: 'Hot Sauce' },
      { sku: 'COND-MUSTARD-HONEY', name: 'Honey Mustard 250ml', price: 169.00, stock: 200, brand: 'HoneyTang', sub_category: 'Mustards', product_type: 'Mustard' },
      { sku: 'COND-VINEGAR-APPLE', name: 'Apple Cider Vinegar 500ml', price: 249.00, stock: 180, brand: 'AppleZest', sub_category: 'Vinegars', product_type: 'Vinegar' },
      { sku: 'COND-BBQ-SAUCE', name: 'BBQ Sauce Smokey 350ml', price: 199.00, stock: 190, brand: 'SmokeHouse', sub_category: 'BBQ Sauces', product_type: 'BBQ Sauce' },
      { sku: 'COND-WORCESTER', name: 'Worcestershire Sauce 200ml', price: 179.00, stock: 160, brand: 'TangySauce', sub_category: 'Sauces', product_type: 'Worcestershire Sauce' },
      { sku: 'COND-PEANUT-BUTTER', name: 'Creamy Peanut Butter 350g', price: 299.00, stock: 220, brand: 'NutSpread', sub_category: 'Spreads', product_type: 'Peanut Butter' },
      { sku: 'COND-JAM-STRAWBERRY', name: 'Strawberry Jam 300g', price: 229.00, stock: 250, brand: 'FruitSweet', sub_category: 'Jams', product_type: 'Jam' },
      { sku: 'COND-OLIVE-OIL', name: 'Extra Virgin Olive Oil 500ml', price: 599.00, stock: 140, brand: 'OlivePure', sub_category: 'Oils', product_type: 'Olive Oil' },
      { sku: 'COND-SALSA-MILD', name: 'Mild Salsa Dip 300g', price: 189.00, stock: 200, brand: 'MexiDip', sub_category: 'Dips', product_type: 'Salsa' }
    ];

    for (const product of condimentsProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['food.owner@example.com']);
        if (userResult.rows.length === 0) continue;
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) continue;
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) continue;

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"preservatives":"minimal","gluten_free":false}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Flavorful ${product.sub_category.toLowerCase()}`, product.brand, 'Condiments & Sauces', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Baking Supplies - 12 products
    const bakingProducts = [
      { sku: 'BAKE-FLOUR-ALL', name: 'All-Purpose Flour 1kg', price: 149.00, stock: 300, brand: 'BakeMaster', sub_category: 'Flour', product_type: 'All-Purpose Flour' },
      { sku: 'BAKE-SUGAR-WHITE', name: 'White Sugar 1kg', price: 129.00, stock: 350, brand: 'SweetBake', sub_category: 'Sugar', product_type: 'White Sugar' },
      { sku: 'BAKE-YEAST-INSTANT', name: 'Instant Yeast 100g', price: 99.00, stock: 200, brand: 'RisePro', sub_category: 'Leavening', product_type: 'Yeast' },
      { sku: 'BAKE-POWDER-BAKING', name: 'Baking Powder 200g', price: 89.00, stock: 250, brand: 'LiftAgent', sub_category: 'Leavening', product_type: 'Baking Powder' },
      { sku: 'BAKE-SODA-BAKING', name: 'Baking Soda 250g', price: 79.00, stock: 280, brand: 'SodaBake', sub_category: 'Leavening', product_type: 'Baking Soda' },
      { sku: 'BAKE-VANILLA-EXTRACT', name: 'Vanilla Extract 100ml', price: 349.00, stock: 150, brand: 'VanillaPure', sub_category: 'Extracts', product_type: 'Vanilla Extract' },
      { sku: 'BAKE-CHOCO-CHIPS', name: 'Chocolate Chips 250g', price: 249.00, stock: 220, brand: 'ChocoDelight', sub_category: 'Mix-ins', product_type: 'Chocolate Chips' },
      { sku: 'BAKE-COCOA-POWDER', name: 'Cocoa Powder 200g', price: 299.00, stock: 180, brand: 'CocoaBake', sub_category: 'Cocoa', product_type: 'Cocoa Powder' },
      { sku: 'BAKE-CORN-STARCH', name: 'Corn Starch 400g', price: 119.00, stock: 240, brand: 'ThickenIt', sub_category: 'Starches', product_type: 'Corn Starch' },
      { sku: 'BAKE-BROWN-SUGAR', name: 'Brown Sugar 500g', price: 159.00, stock: 200, brand: 'CaramelSweet', sub_category: 'Sugar', product_type: 'Brown Sugar' },
      { sku: 'BAKE-BUTTER-UNSALTED', name: 'Unsalted Butter 250g', price: 299.00, stock: 160, brand: 'CreamyBake', sub_category: 'Dairy', product_type: 'Butter' },
      { sku: 'BAKE-EGGS-POWDER', name: 'Egg Powder 200g', price: 349.00, stock: 120, brand: 'EggBake', sub_category: 'Egg Products', product_type: 'Egg Powder' }
    ];

    for (const product of bakingProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['food.owner@example.com']);
        if (userResult.rows.length === 0) continue;
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) continue;
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) continue;

        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory, price, stock, attributes, images, product_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{"quality":"premium","baker_approved":true}', $11::jsonb, $12)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Essential ${product.sub_category.toLowerCase()}`, product.brand, 'Baking Supplies', product.sub_category, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`, product.product_type]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Create shops for each platform (accounts already created earlier)
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

    // Seed product sales data for the entire months of October and November 2025
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-11-30');
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

    // Ensure required column exists for aggregation (defensive)
    try {
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='product_sales' AND column_name='total_sales'
          ) THEN
            ALTER TABLE product_sales ADD COLUMN total_sales DECIMAL(12,2) NOT NULL DEFAULT 0;
          END IF;
        END $$;
      `);
    } catch (error) {
      console.error('Error ensuring product_sales.total_sales column:', error.message);
    }


    // Create product_listings linking products to their shop (idempotent)
    // Electronics on all platforms
    await pool.query(`
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, listing_special_price, listing_stock, currency, listing_status, promo_start, promo_end)
      SELECT p.product_id, a.account_id, s.shop_id, 'shopee', p.sku, p.name,
             p.price * 0.97,
             CASE WHEN RANDOM() < 0.4 THEN (p.price * 0.90) ELSE NULL END,
             FLOOR(RANDOM() * 150 + 20)::int,
             'PHP', 'active',
             CASE WHEN RANDOM() < 0.3 THEN NOW() ELSE NULL END,
             CASE WHEN RANDOM() < 0.3 THEN NOW() + INTERVAL '7 days' ELSE NULL END
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
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, listing_special_price, listing_stock, currency, listing_status, promo_start, promo_end)
      SELECT p.product_id, a.account_id, s.shop_id, 'lazada', p.sku, p.name,
             p.price * 1.02,
             CASE WHEN RANDOM() < 0.35 THEN (p.price * 0.92) ELSE NULL END,
             FLOOR(RANDOM() * 180 + 30)::int,
             'PHP', 'active',
             CASE WHEN RANDOM() < 0.25 THEN NOW() ELSE NULL END,
             CASE WHEN RANDOM() < 0.25 THEN NOW() + INTERVAL '10 days' ELSE NULL END
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
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, listing_special_price, listing_stock, currency, listing_status, promo_start, promo_end)
      SELECT p.product_id, a.account_id, s.shop_id, 'tiktok', p.sku, p.name,
             p.price * 0.93,
             CASE WHEN RANDOM() < 0.5 THEN (p.price * 0.88) ELSE NULL END,
             FLOOR(RANDOM() * 120 + 10)::int,
             'PHP', 'active',
             CASE WHEN RANDOM() < 0.4 THEN NOW() ELSE NULL END,
             CASE WHEN RANDOM() < 0.4 THEN NOW() + INTERVAL '5 days' ELSE NULL END
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
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, listing_special_price, listing_stock, currency, listing_status, promo_start, promo_end)
      SELECT p.product_id, a.account_id, s.shop_id, 'lazada', p.sku, p.name,
             p.price * 1.02,
             CASE WHEN RANDOM() < 0.35 THEN (p.price * 0.92) ELSE NULL END,
             FLOOR(RANDOM() * 180 + 30)::int,
             'PHP', 'active',
             CASE WHEN RANDOM() < 0.25 THEN NOW() ELSE NULL END,
             CASE WHEN RANDOM() < 0.25 THEN NOW() + INTERVAL '10 days' ELSE NULL END
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
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, listing_special_price, listing_stock, currency, listing_status, promo_start, promo_end)
      SELECT p.product_id, a.account_id, s.shop_id, 'shopee', p.sku, p.name,
             p.price * 0.97,
             CASE WHEN RANDOM() < 0.4 THEN (p.price * 0.90) ELSE NULL END,
             FLOOR(RANDOM() * 150 + 20)::int,
             'PHP', 'active',
             CASE WHEN RANDOM() < 0.3 THEN NOW() ELSE NULL END,
             CASE WHEN RANDOM() < 0.3 THEN NOW() + INTERVAL '7 days' ELSE NULL END
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
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, listing_special_price, listing_stock, currency, listing_status, promo_start, promo_end)
      SELECT p.product_id, a.account_id, s.shop_id, 'tiktok', p.sku, p.name,
             p.price * 0.93,
             CASE WHEN RANDOM() < 0.5 THEN (p.price * 0.88) ELSE NULL END,
             FLOOR(RANDOM() * 120 + 10)::int,
             'PHP', 'active',
             CASE WHEN RANDOM() < 0.4 THEN NOW() ELSE NULL END,
             CASE WHEN RANDOM() < 0.4 THEN NOW() + INTERVAL '5 days' ELSE NULL END
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
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, listing_special_price, listing_stock, currency, listing_status, promo_start, promo_end)
      SELECT p.product_id, a.account_id, s.shop_id, 'tiktok', p.sku, p.name,
             p.price * 0.93,
             CASE WHEN RANDOM() < 0.5 THEN (p.price * 0.88) ELSE NULL END,
             FLOOR(RANDOM() * 120 + 10)::int,
             'PHP', 'active',
             CASE WHEN RANDOM() < 0.4 THEN NOW() ELSE NULL END,
             CASE WHEN RANDOM() < 0.4 THEN NOW() + INTERVAL '5 days' ELSE NULL END
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
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, listing_special_price, listing_stock, currency, listing_status, promo_start, promo_end)
      SELECT p.product_id, a.account_id, s.shop_id, 'shopee', p.sku, p.name,
             p.price * 0.97,
             CASE WHEN RANDOM() < 0.4 THEN (p.price * 0.90) ELSE NULL END,
             FLOOR(RANDOM() * 150 + 20)::int,
             'PHP', 'active',
             CASE WHEN RANDOM() < 0.3 THEN NOW() ELSE NULL END,
             CASE WHEN RANDOM() < 0.3 THEN NOW() + INTERVAL '7 days' ELSE NULL END
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
      INSERT INTO product_listings (product_id, account_id, shop_id, platform, platform_product_id, title, listing_price, listing_special_price, listing_stock, currency, listing_status, promo_start, promo_end)
      SELECT p.product_id, a.account_id, s.shop_id, 'lazada', p.sku, p.name,
             p.price * 1.02,
             CASE WHEN RANDOM() < 0.35 THEN (p.price * 0.92) ELSE NULL END,
             FLOOR(RANDOM() * 180 + 30)::int,
             'PHP', 'active',
             CASE WHEN RANDOM() < 0.25 THEN NOW() ELSE NULL END,
             CASE WHEN RANDOM() < 0.25 THEN NOW() + INTERVAL '10 days' ELSE NULL END
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
  if (!checkDockerAvailability() || !checkDockerPostgresRunning()) {
    console.log('🐳 Docker PostgreSQL not available, skipping Docker seeding');
    return true;
  }
  
  const containerName = getDockerContainerName();
  const dockerPort = getDockerPort();
  console.log(`🔄 Attempting to seed via Docker (${containerName}:${dockerPort})...`);
  
  const rolesSql = `INSERT INTO roles (name, description) VALUES ('business_owner','Business owner with access to Insights and business modules'),('admin','Administrator with elevated privileges'),('system_admin','System administrator with full platform control') ON CONFLICT (name) DO NOTHING;`;
  const permsSql = `INSERT INTO permissions (name, description) VALUES ('create','Create resources'),('read','Read resources'),('update','Update resources'),('deactivate','Deactivate resources'),('view_dashboard','Access user dashboard'),('view_settings','Access settings page'),('view_products','Access products'),('view_insights','Access insights module'),('view_admin_dashboard','Access admin dashboard'),('view_admin_manage_users','Access admin manage users'),('view_admin_integrations','Access admin integrations'),('view_admin_system_health','Access admin system health') ON CONFLICT (name) DO NOTHING;`;
  try {
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "${rolesSql}"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "${permsSql}"`, { stdio: 'inherit' });
    // users (demo only)
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO users (username,fname,lname,email,password) SELECT 'demo_user','Demo','User','user@example.com','password123' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='user@example.com');"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO users (username,fname,lname,email,password) SELECT 'demo_admin','Demo','Admin','admin@example.com','admin123' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='admin@example.com');"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO users (username,fname,lname,email,password) SELECT 'demo_system_admin','Demo','SystemAdmin','system.admin@example.com','system123' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='system.admin@example.com');"`, { stdio: 'inherit' });
    // user_roles (demo only)
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO user_roles (user_id,role_id) SELECT u.user_id,r.role_id FROM users u, roles r WHERE u.email='user@example.com' AND r.name='business_owner' AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO user_roles (user_id,role_id) SELECT u.user_id,r.role_id FROM users u, roles r WHERE u.email='admin@example.com' AND r.name='admin' AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO user_roles (user_id,role_id) SELECT u.user_id,r.role_id FROM users u, roles r WHERE u.email='system.admin@example.com' AND r.name='system_admin' AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);"`, { stdio: 'inherit' });
    // role_permissions: business_owner
    const bo = ['view_dashboard','view_settings','view_products','view_insights','read','update'];
    for (const p of bo) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO role_permissions (permission_id,role_id,permission) SELECT pe.permission_id,r.role_id,pe.name FROM permissions pe, roles r WHERE pe.name='${p}' AND r.name='business_owner' AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.permission_id=pe.permission_id AND rp.role_id=r.role_id);"`, { stdio: 'inherit' });
    }
    // admin
    const ad = ['view_admin_dashboard','view_admin_manage_users','view_admin_integrations','view_admin_system_health','read','update','deactivate'];
    for (const p of ad) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO role_permissions (permission_id,role_id,permission) SELECT pe.permission_id,r.role_id,pe.name FROM permissions pe, roles r WHERE pe.name='${p}' AND r.name='admin' AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.permission_id=pe.permission_id AND rp.role_id=r.role_id);"`, { stdio: 'inherit' });
    }
    // system_admin: all perms
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO role_permissions (permission_id,role_id,permission) SELECT pe.permission_id,r.role_id,pe.name FROM permissions pe, roles r WHERE r.name='system_admin' AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.permission_id=pe.permission_id AND rp.role_id=r.role_id);"`, { stdio: 'inherit' });

    // Additional demo users (idempotent)
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO users (username,fname,lname,email,password) SELECT 'electronics_owner','Electra','Shop','electronics.owner@example.com','electra123' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='electronics.owner@example.com');"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO users (username,fname,lname,email,password) SELECT 'cosmetics_owner','Cosma','Beauty','cosmetics.owner@example.com','cosma123' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='cosmetics.owner@example.com');"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO users (username,fname,lname,email,password) SELECT 'food_owner','Gusto','Bites','food.owner@example.com','gusto123' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='food.owner@example.com');"`, { stdio: 'inherit' });
    // Map shop demo users to business_owner role
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO user_roles (user_id,role_id) SELECT u.user_id,r.role_id FROM users u, roles r WHERE r.name='business_owner' AND u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO user_roles (user_id,role_id) SELECT u.user_id,r.role_id FROM users u, roles r WHERE r.name='business_owner' AND u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO user_roles (user_id,role_id) SELECT u.user_id,r.role_id FROM users u, roles r WHERE r.name='business_owner' AND u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=r.role_id);"`, { stdio: 'inherit' });

    // Electronics products (15 total)
    const electronicsDockerProducts = [
      { sku: 'ELEC-TV-55-4K', name: '4K Smart TV 55-inch', price: 25999.00, stock: 25, brand: 'Electra', sub_category: 'TV & Video', product_type: 'Smart TV' },
      { sku: 'ELEC-HEAD-NC', name: 'Noise-Cancelling Headphones', price: 7999.00, stock: 100, brand: 'SonicX', sub_category: 'Audio', product_type: 'Headphones' },
      { sku: 'ELEC-PHONE-128', name: 'Smartphone 128GB', price: 15999.00, stock: 50, brand: 'TechCore', sub_category: 'Mobile', product_type: 'Smartphone' },
      { sku: 'ELEC-LAPTOP-16', name: 'Gaming Laptop 16GB RAM', price: 45999.00, stock: 15, brand: 'GameMax', sub_category: 'Computers', product_type: 'Laptop' },
      { sku: 'ELEC-TABLET-10', name: '10-inch Tablet', price: 12999.00, stock: 75, brand: 'TabPro', sub_category: 'Tablets', product_type: 'Tablet' },
      { sku: 'ELEC-SPEAKER-BT', name: 'Bluetooth Speaker', price: 2999.00, stock: 200, brand: 'SoundWave', sub_category: 'Audio', product_type: 'Speaker' },
      { sku: 'ELEC-CAMERA-4K', name: '4K Action Camera', price: 8999.00, stock: 60, brand: 'ActionCam', sub_category: 'Cameras', product_type: 'Action Camera' },
      { sku: 'ELEC-SMARTWATCH', name: 'Smart Watch Pro', price: 5999.00, stock: 120, brand: 'WearTech', sub_category: 'Wearables', product_type: 'Smart Watch' },
      { sku: 'ELEC-CHARGER-WIRELESS', name: 'Wireless Charger', price: 1999.00, stock: 300, brand: 'ChargeMax', sub_category: 'Accessories', product_type: 'Wireless Charger' },
      { sku: 'ELEC-KEYBOARD-MECH', name: 'Mechanical Keyboard', price: 3999.00, stock: 80, brand: 'KeyMaster', sub_category: 'Input Devices', product_type: 'Mechanical Keyboard' },
      { sku: 'ELEC-MOUSE-GAMING', name: 'Gaming Mouse RGB', price: 2499.00, stock: 150, brand: 'GameGear', sub_category: 'Input Devices', product_type: 'Gaming Mouse' },
      { sku: 'ELEC-MONITOR-27', name: '27-inch Gaming Monitor', price: 18999.00, stock: 30, brand: 'DisplayPro', sub_category: 'Display', product_type: 'Gaming Monitor' },
      { sku: 'ELEC-WEBCAM-4K', name: '4K Webcam Pro', price: 6999.00, stock: 90, brand: 'StreamCam', sub_category: 'Video', product_type: 'Webcam' },
      { sku: 'ELEC-ROUTER-WIFI6', name: 'WiFi 6 Router', price: 12999.00, stock: 40, brand: 'NetMax', sub_category: 'Networking', product_type: 'Router' },
      { sku: 'ELEC-POWERBANK-20K', name: '20,000mAh Power Bank', price: 3499.00, stock: 180, brand: 'PowerMax', sub_category: 'Accessories', product_type: 'Power Bank' }
    ];

    for (const product of electronicsDockerProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category,subcategory,product_type,price,stock,attributes,images,weight_value,weight_unit,length_cm,width_cm,height_cm) SELECT u.user_id,'${product.name}','${product.sku}','${product.name} - High quality ${product.sub_category.toLowerCase()}','${product.brand}','Electronics','${product.sub_category}','${product.product_type}',${product.price},${product.stock},'{\\\"color\\\":\\\"black\\\",\\\"warranty\\\":\\\"1 year\\\"}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb,500,'g',20.5,15.0,8.0 FROM users u WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }
    // Cosmetics products (15 total)
    const cosmeticsDockerProducts = [
      { sku: 'COS-SERUM-30', name: 'Hydrating Serum 30ml', price: 1299.00, stock: 200, brand: 'GlowUp', sub_category: 'Serums', product_type: 'Hydrating Serum' },
      { sku: 'COS-LIP-MATTE', name: 'Matte Lipstick', price: 499.00, stock: 300, brand: 'Chroma', sub_category: 'Makeup', product_type: 'Lipstick' },
      { sku: 'COS-FOUNDATION-30', name: 'Full Coverage Foundation', price: 899.00, stock: 150, brand: 'BeautyBase', sub_category: 'Makeup', product_type: 'Foundation' },
      { sku: 'COS-MASCARA-VOL', name: 'Volumizing Mascara', price: 599.00, stock: 250, brand: 'LashPro', sub_category: 'Makeup', product_type: 'Mascara' },
      { sku: 'COS-CLEANSER-GEL', name: 'Gentle Gel Cleanser', price: 699.00, stock: 180, brand: 'PureSkin', sub_category: 'Cleansers', product_type: 'Gel Cleanser' },
      { sku: 'COS-MOISTURIZER-50', name: 'Anti-Aging Moisturizer', price: 1499.00, stock: 120, brand: 'AgeDefy', sub_category: 'Moisturizers', product_type: 'Anti-Aging Moisturizer' },
      { sku: 'COS-EYESHADOW-PAL', name: 'Eyeshadow Palette', price: 1299.00, stock: 100, brand: 'ColorPop', sub_category: 'Makeup', product_type: 'Eyeshadow' },
      { sku: 'COS-SUNSCREEN-SPF50', name: 'SPF 50 Sunscreen', price: 799.00, stock: 200, brand: 'SunGuard', sub_category: 'Sun Protection', product_type: 'Sunscreen' },
      { sku: 'COS-CONCEALER-FULL', name: 'Full Coverage Concealer', price: 649.00, stock: 175, brand: 'HideIt', sub_category: 'Makeup', product_type: 'Concealer' },
      { sku: 'COS-TONER-200', name: 'Hydrating Toner', price: 549.00, stock: 160, brand: 'Refresh', sub_category: 'Toners', product_type: 'Hydrating Toner' },
      { sku: 'COS-LIPGLOSS-SHINE', name: 'Shiny Lip Gloss', price: 399.00, stock: 220, brand: 'Glossy', sub_category: 'Makeup', product_type: 'Lip Gloss' },
      { sku: 'COS-FACEMASK-5PACK', name: 'Hydrating Face Mask 5-pack', price: 999.00, stock: 80, brand: 'MaskCare', sub_category: 'Masks', product_type: 'Face Mask' },
      { sku: 'COS-BLUSH-PINK', name: 'Pink Blush Compact', price: 749.00, stock: 140, brand: 'Cheeky', sub_category: 'Makeup', product_type: 'Blush' },
      { sku: 'COS-EYELINER-WING', name: 'Winged Eyeliner Pen', price: 449.00, stock: 190, brand: 'WingMaster', sub_category: 'Makeup', product_type: 'Eyeliner' },
      { sku: 'COS-EXFOLIATOR-SCRUB', name: 'Gentle Exfoliating Scrub', price: 899.00, stock: 110, brand: 'SmoothSkin', sub_category: 'Exfoliators', product_type: 'Exfoliating Scrub' }
    ];

    for (const product of cosmeticsDockerProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category,subcategory,product_type,price,stock,attributes,images,weight_value,weight_unit,length_cm,width_cm,height_cm) SELECT u.user_id,'${product.name}','${product.sku}','${product.name} - Premium ${product.sub_category.toLowerCase()}','${product.brand}','Cosmetics','${product.sub_category}','${product.product_type}',${product.price},${product.stock},'{\\\"skin_type\\\":\\\"all\\\",\\\"cruelty_free\\\":true}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb,100,'g',8.0,4.0,12.0 FROM users u WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Food & Drinks products (15 total)
    const foodDockerProducts = [
      { sku: 'FOOD-CBREW-1L', name: 'Cold Brew Coffee 1L', price: 299.00, stock: 150, brand: 'BrewLab', sub_category: 'Beverages', product_type: 'Coffee' },
      { sku: 'FOOD-PROTBAR-12', name: 'Protein Snack Bars (12-pack)', price: 799.00, stock: 120, brand: 'NutriBite', sub_category: 'Snacks', product_type: 'Protein Bar' },
      { sku: 'FOOD-GRANOLA-500G', name: 'Organic Granola 500g', price: 449.00, stock: 200, brand: 'NatureCrunch', sub_category: 'Breakfast', product_type: 'Granola' },
      { sku: 'FOOD-SMOOTHIE-MIX', name: 'Superfood Smoothie Mix', price: 599.00, stock: 100, brand: 'GreenBoost', sub_category: 'Beverages', product_type: 'Smoothie Mix' },
      { sku: 'FOOD-CHOCOLATE-DARK', name: 'Dark Chocolate 70%', price: 349.00, stock: 300, brand: 'CocoaPure', sub_category: 'Confectionery', product_type: 'Dark Chocolate' },
      { sku: 'FOOD-NUTS-MIXED', name: 'Mixed Nuts 250g', price: 399.00, stock: 180, brand: 'NuttyGood', sub_category: 'Snacks', product_type: 'Mixed Nuts' },
      { sku: 'FOOD-TEA-GREEN', name: 'Green Tea Bags (50-pack)', price: 249.00, stock: 250, brand: 'TeaLeaf', sub_category: 'Beverages', product_type: 'Tea' },
      { sku: 'FOOD-HONEY-RAW', name: 'Raw Honey 500g', price: 699.00, stock: 80, brand: 'BeePure', sub_category: 'Sweeteners', product_type: 'Raw Honey' },
      { sku: 'FOOD-CRACKERS-SEED', name: 'Seed Crackers 200g', price: 299.00, stock: 150, brand: 'CrispySeed', sub_category: 'Snacks', product_type: 'Crackers' },
      { sku: 'FOOD-JUICE-ORGANIC', name: 'Organic Apple Juice 1L', price: 199.00, stock: 200, brand: 'FruitFresh', sub_category: 'Beverages', product_type: 'Juice' },
      { sku: 'FOOD-SPICE-MIX', name: 'Gourmet Spice Mix Set', price: 899.00, stock: 60, brand: 'SpiceMaster', sub_category: 'Pantry', product_type: 'Spice Mix' },
      { sku: 'FOOD-CEREAL-HEALTHY', name: 'Healthy Cereal 500g', price: 549.00, stock: 120, brand: 'GrainGood', sub_category: 'Breakfast', product_type: 'Cereal' },
      { sku: 'FOOD-ENERGY-DRINK', name: 'Natural Energy Drink', price: 149.00, stock: 300, brand: 'EnergyBoost', sub_category: 'Beverages', product_type: 'Energy Drink' },
      { sku: 'FOOD-DRIED-FRUIT', name: 'Mixed Dried Fruit 300g', price: 399.00, stock: 160, brand: 'FruitMix', sub_category: 'Snacks', product_type: 'Dried Fruit' },
      { sku: 'FOOD-SUPERFOOD-POWDER', name: 'Superfood Powder 200g', price: 1299.00, stock: 70, brand: 'SuperNutrients', sub_category: 'Supplements', product_type: 'Superfood Powder' }
    ];

    for (const product of foodDockerProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category,subcategory,product_type,price,stock,attributes,images,weight_value,weight_unit,length_cm,width_cm,height_cm) SELECT u.user_id,'${product.name}','${product.sku}','${product.name} - Premium ${product.sub_category.toLowerCase()}','${product.brand}','Food & Drinks','${product.sub_category}','${product.product_type}',${product.price},${product.stock},'{\\\"organic\\\":true,\\\"gluten_free\\\":true}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb,1000,'g',25.0,15.0,10.0 FROM users u WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Additional categories for comprehensive seeding
    // Appliances - 12 products
    const appliancesProducts = [
      { sku: 'APP-WASHER-8KG', name: 'Front Load Washer 8kg', price: 25999.00, stock: 15, brand: 'CleanMax', sub_category: 'Laundry', product_type: 'Washing Machine' },
      { sku: 'APP-DRYER-8KG', name: 'Heat Pump Dryer 8kg', price: 22999.00, stock: 12, brand: 'DryPro', sub_category: 'Laundry', product_type: 'Dryer' },
      { sku: 'APP-FRIDGE-500L', name: 'French Door Refrigerator', price: 45999.00, stock: 8, brand: 'CoolMax', sub_category: 'Kitchen', product_type: 'Refrigerator' },
      { sku: 'APP-OVEN-ELECTRIC', name: 'Electric Convection Oven', price: 18999.00, stock: 20, brand: 'BakePro', sub_category: 'Kitchen', product_type: 'Oven' },
      { sku: 'APP-DISHWASHER-12', name: 'Built-in Dishwasher 12-place', price: 19999.00, stock: 18, brand: 'WashMax', sub_category: 'Kitchen', product_type: 'Dishwasher' },
      { sku: 'APP-MICROWAVE-25L', name: '25L Convection Microwave', price: 8999.00, stock: 25, brand: 'MicroPro', sub_category: 'Kitchen', product_type: 'Microwave Oven' },
      { sku: 'APP-AIRCOND-1HP', name: '1HP Inverter Air Conditioner', price: 15999.00, stock: 30, brand: 'CoolAir', sub_category: 'Climate', product_type: 'Air Conditioner' },
      { sku: 'APP-VACUUM-ROBOT', name: 'Robot Vacuum Cleaner', price: 12999.00, stock: 22, brand: 'CleanBot', sub_category: 'Cleaning', product_type: 'Robot Vacuum Cleaner' },
      { sku: 'APP-BLENDER-PRO', name: 'Professional Blender', price: 6999.00, stock: 35, brand: 'BlendMax', sub_category: 'Kitchen', product_type: 'Blender' },
      { sku: 'APP-COFFEE-ESPRESSO', name: 'Espresso Coffee Machine', price: 14999.00, stock: 15, brand: 'BrewPro', sub_category: 'Kitchen', product_type: 'Coffee Machine' },
      { sku: 'APP-WATER-HEATER', name: 'Tankless Water Heater', price: 17999.00, stock: 10, brand: 'HeatMax', sub_category: 'Plumbing', product_type: 'Water Heater' },
      { sku: 'APP-FAN-CEILING', name: 'Smart Ceiling Fan', price: 4999.00, stock: 40, brand: 'AirFlow', sub_category: 'Climate', product_type: 'Ceiling Fan' }
    ];

    for (const product of appliancesProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,account_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images,product_type) SELECT u.user_id,a.account_id,'${product.name}','${product.sku}','${product.name} - High quality ${product.sub_category.toLowerCase()}','${product.brand}','Appliances','${product.sub_category}',${product.price},${product.stock},'{\\\"energy_rating\\\":\\\"A+\\\",\\\"warranty\\\":\\\"2 years\\\"}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb,'${product.product_type}' FROM users u JOIN accounts a ON a.owner_user_id=u.user_id WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Skincare - 12 products
    const skincareProducts = [
      { sku: 'SKIN-CLEANSER-GEL', name: 'Gentle Gel Cleanser', price: 699.00, stock: 180, brand: 'PureSkin', sub_category: 'Cleansers', product_type: 'Gel Cleanser' },
      { sku: 'SKIN-MOISTURIZER-50', name: 'Anti-Aging Moisturizer', price: 1499.00, stock: 120, brand: 'AgeDefy', sub_category: 'Moisturizers', product_type: 'Anti-Aging Moisturizer' },
      { sku: 'SKIN-SERUM-30', name: 'Hydrating Serum 30ml', price: 1299.00, stock: 200, brand: 'GlowUp', sub_category: 'Serums', product_type: 'Hydrating Serum' },
      { sku: 'SKIN-SUNSCREEN-SPF50', name: 'SPF 50 Sunscreen', price: 799.00, stock: 200, brand: 'SunGuard', sub_category: 'Sun Protection', product_type: 'Sunscreen' },
      { sku: 'SKIN-TONER-200', name: 'Hydrating Toner', price: 549.00, stock: 160, brand: 'Refresh', sub_category: 'Toners', product_type: 'Hydrating Toner' },
      { sku: 'SKIN-FACEMASK-5PACK', name: 'Hydrating Face Mask 5-pack', price: 999.00, stock: 80, brand: 'MaskCare', sub_category: 'Masks', product_type: 'Face Mask' },
      { sku: 'SKIN-EXFOLIATOR-SCRUB', name: 'Gentle Exfoliating Scrub', price: 899.00, stock: 110, brand: 'SmoothSkin', sub_category: 'Exfoliators', product_type: 'Exfoliating Scrub' },
      { sku: 'SKIN-EYE-CREAM', name: 'Anti-Aging Eye Cream', price: 1199.00, stock: 90, brand: 'EyeCare', sub_category: 'Eye Care', product_type: 'Eye Cream' },
      { sku: 'SKIN-NIGHT-CREAM', name: 'Repair Night Cream', price: 1399.00, stock: 85, brand: 'NightRepair', sub_category: 'Night Care', product_type: 'Night Cream' },
      { sku: 'SKIN-VITAMIN-C', name: 'Vitamin C Brightening Serum', price: 1099.00, stock: 95, brand: 'BrightSkin', sub_category: 'Serums', product_type: 'Vitamin C Serum' },
      { sku: 'SKIN-RETINOL-CREAM', name: 'Retinol Anti-Aging Cream', price: 1599.00, stock: 70, brand: 'RetinolPro', sub_category: 'Night Care', product_type: 'Retinol Cream' },
      { sku: 'SKIN-HYALURONIC-ACID', name: 'Hyaluronic Acid Serum', price: 899.00, stock: 130, brand: 'HydraMax', sub_category: 'Serums', product_type: 'Hyaluronic Acid Serum' }
    ];

    for (const product of skincareProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,account_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images,product_type) SELECT u.user_id,a.account_id,'${product.name}','${product.sku}','${product.name} - Premium ${product.sub_category.toLowerCase()}','${product.brand}','Skincare','${product.sub_category}',${product.price},${product.stock},'{\\\"dermatologist_tested\\\":true,\\\"hypoallergenic\\\":true}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb,'${product.product_type}' FROM users u JOIN accounts a ON a.owner_user_id=u.user_id WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Fashion - 12 products
    const fashionProducts = [
      { sku: 'FASH-SHIRT-COTTON', name: 'Cotton Button-Down Shirt', price: 1299.00, stock: 50, brand: 'StyleCo', sub_category: 'Clothing', product_type: 'Shirt' },
      { sku: 'FASH-JEANS-SLIM', name: 'Slim Fit Jeans', price: 1899.00, stock: 40, brand: 'DenimPro', sub_category: 'Clothing', product_type: 'Jeans' },
      { sku: 'FASH-DRESS-CASUAL', name: 'Casual Summer Dress', price: 1599.00, stock: 35, brand: 'DressUp', sub_category: 'Clothing', product_type: 'Dress' },
      { sku: 'FASH-JACKET-DENIM', name: 'Denim Jacket', price: 2199.00, stock: 25, brand: 'JacketMax', sub_category: 'Outerwear', product_type: 'Jacket' },
      { sku: 'FASH-SHOES-SNEAKERS', name: 'Canvas Sneakers', price: 2499.00, stock: 60, brand: 'ShoePro', sub_category: 'Footwear', product_type: 'Sneakers' },
      { sku: 'FASH-BAG-TOTE', name: 'Canvas Tote Bag', price: 899.00, stock: 45, brand: 'BagMaster', sub_category: 'Accessories', product_type: 'Handbag' },
      { sku: 'FASH-SCARF-SILK', name: 'Silk Scarf', price: 699.00, stock: 30, brand: 'SilkStyle', sub_category: 'Accessories', product_type: 'Scarf' },
      { sku: 'FASH-BELT-LEATHER', name: 'Genuine Leather Belt', price: 1199.00, stock: 55, brand: 'LeatherPro', sub_category: 'Accessories', product_type: 'Belt' },
      { sku: 'FASH-WATCH-CLASSIC', name: 'Classic Leather Watch', price: 2999.00, stock: 20, brand: 'TimeStyle', sub_category: 'Accessories', product_type: 'Watch' },
      { sku: 'FASH-SUNGLASSES', name: 'UV Protection Sunglasses', price: 1499.00, stock: 40, brand: 'SunStyle', sub_category: 'Accessories', product_type: 'Sunglasses' },
      { sku: 'FASH-HAT-BASEBALL', name: 'Baseball Cap', price: 599.00, stock: 80, brand: 'CapStyle', sub_category: 'Accessories', product_type: 'Cap' },
      { sku: 'FASH-SOCKS-PACK', name: 'Cotton Socks 6-pack', price: 399.00, stock: 100, brand: 'SockPro', sub_category: 'Clothing', product_type: 'Socks' }
    ];

    for (const product of fashionProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,account_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images,product_type) SELECT u.user_id,a.account_id,'${product.name}','${product.sku}','${product.name} - Premium ${product.sub_category.toLowerCase()}','${product.brand}','Fashion','${product.sub_category}',${product.price},${product.stock},'{\\\"material\\\":\\\"quality\\\",\\\"size_range\\\":\\\"various\\\"}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb,'${product.product_type}' FROM users u JOIN accounts a ON a.owner_user_id=u.user_id WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Home & Living - 12 products
    const homeProducts = [
      { sku: 'HOME-CUSHION-SET', name: 'Decorative Cushion Set', price: 899.00, stock: 60, brand: 'ComfortCo', sub_category: 'Decor', product_type: 'Cushion' },
      { sku: 'HOME-LAMP-TABLE', name: 'Modern Table Lamp', price: 1299.00, stock: 40, brand: 'LightStyle', sub_category: 'Lighting', product_type: 'Desk Lamp' },
      { sku: 'HOME-RUG-WOOL', name: 'Wool Area Rug', price: 2999.00, stock: 25, brand: 'RugMaster', sub_category: 'Flooring', product_type: 'Area Rug' },
      { sku: 'HOME-CURTAINS-SET', name: 'Blackout Curtains Set', price: 1899.00, stock: 30, brand: 'WindowStyle', sub_category: 'Decor', product_type: 'Curtains' },
      { sku: 'HOME-VASE-CERAMIC', name: 'Ceramic Decorative Vase', price: 699.00, stock: 50, brand: 'PotteryPro', sub_category: 'Decor', product_type: 'Vase' },
      { sku: 'HOME-MIRROR-WALL', name: 'Wall Mirror 60cm', price: 1499.00, stock: 35, brand: 'MirrorMax', sub_category: 'Decor', product_type: 'Wall Mirror' },
      { sku: 'HOME-PLANT-POT', name: 'Plant Pot with Saucer', price: 399.00, stock: 80, brand: 'PlantStyle', sub_category: 'Garden', product_type: 'Plant Pot' },
      { sku: 'HOME-CANDLE-SET', name: 'Scented Candle Set', price: 599.00, stock: 45, brand: 'AromaCo', sub_category: 'Decor', product_type: 'Candles' },
      { sku: 'HOME-THROW-BLANKET', name: 'Soft Throw Blanket', price: 999.00, stock: 55, brand: 'CozyStyle', sub_category: 'Bedding', product_type: 'Blanket' },
      { sku: 'HOME-PHOTO-FRAME', name: 'Photo Frame Set 5pc', price: 499.00, stock: 70, brand: 'FramePro', sub_category: 'Decor', product_type: 'Photo Frame' },
      { sku: 'HOME-COASTER-SET', name: 'Cork Coaster Set', price: 299.00, stock: 90, brand: 'TableStyle', sub_category: 'Decor', product_type: 'Coaster' },
      { sku: 'HOME-BOOKEND-PAIR', name: 'Decorative Bookends', price: 799.00, stock: 40, brand: 'BookStyle', sub_category: 'Decor', product_type: 'Bookends' }
    ];

    for (const product of homeProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,account_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images,product_type) SELECT u.user_id,a.account_id,'${product.name}','${product.sku}','${product.name} - Premium ${product.sub_category.toLowerCase()}','${product.brand}','Home & Living','${product.sub_category}',${product.price},${product.stock},'{\\\"eco_friendly\\\":true,\\\"durable\\\":true}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb,'${product.product_type}' FROM users u JOIN accounts a ON a.owner_user_id=u.user_id WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Additional categories to match local database
    // Condiments & Sauces - 12 products
    const condimentsProducts = [
      { sku: 'COND-SOY-SAUCE', name: 'Premium Soy Sauce 500ml', price: 299.00, stock: 100, brand: 'AsianFlavor', sub_category: 'Sauces', product_type: 'Soy Sauce' },
      { sku: 'COND-OLIVE-OIL', name: 'Extra Virgin Olive Oil', price: 899.00, stock: 80, brand: 'Mediterranean', sub_category: 'Oils', product_type: 'Olive Oil' },
      { sku: 'COND-BALSAMIC', name: 'Aged Balsamic Vinegar', price: 699.00, stock: 60, brand: 'ItalianStyle', sub_category: 'Vinegars', product_type: 'Vinegar' },
      { sku: 'COND-MUSTARD-DIJON', name: 'Dijon Mustard', price: 399.00, stock: 120, brand: 'FrenchTaste', sub_category: 'Mustards', product_type: 'Mustard' },
      { sku: 'COND-KETCHUP-ORGANIC', name: 'Organic Ketchup', price: 249.00, stock: 150, brand: 'NaturalTaste', sub_category: 'Sauces', product_type: 'Ketchup' },
      { sku: 'COND-MAYO-AVOCADO', name: 'Avocado Mayo', price: 349.00, stock: 90, brand: 'HealthyChoice', sub_category: 'Spreads', product_type: 'Mayonnaise' },
      { sku: 'COND-HOT-SAUCE', name: 'Hot Sauce Variety Pack', price: 599.00, stock: 70, brand: 'SpiceMaster', sub_category: 'Hot Sauces', product_type: 'Hot Sauce' },
      { sku: 'COND-WORCESTERSHIRE', name: 'Worcestershire Sauce', price: 199.00, stock: 110, brand: 'ClassicTaste', sub_category: 'Sauces', product_type: 'Worcestershire Sauce' },
      { sku: 'COND-TAHINI', name: 'Sesame Tahini Paste', price: 449.00, stock: 85, brand: 'MiddleEastern', sub_category: 'Spreads', product_type: 'Tahini' },
      { sku: 'COND-FISH-SAUCE', name: 'Fish Sauce Premium', price: 299.00, stock: 75, brand: 'AsianCuisine', sub_category: 'Sauces', product_type: 'Fish Sauce' },
      { sku: 'COND-MISO-PASTE', name: 'White Miso Paste', price: 399.00, stock: 65, brand: 'JapaneseFlavor', sub_category: 'Sauces', product_type: 'Miso Paste' },
      { sku: 'COND-SESAME-OIL', name: 'Toasted Sesame Oil', price: 349.00, stock: 95, brand: 'AsianEssence', sub_category: 'Oils', product_type: 'Sesame Oil' }
    ];

    for (const product of condimentsProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,account_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images,product_type) SELECT u.user_id,a.account_id,'${product.name}','${product.sku}','${product.name} - Premium ${product.sub_category.toLowerCase()}','${product.brand}','Condiments & Sauces','${product.sub_category}',${product.price},${product.stock},'{\\\"natural\\\":true,\\\"preservative_free\\\":true}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb,'${product.product_type}' FROM users u JOIN accounts a ON a.owner_user_id=u.user_id WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Snacks - 12 products
    const snacksProducts = [
      { sku: 'SNACK-CHIPS-POTATO', name: 'Potato Chips Classic', price: 199.00, stock: 200, brand: 'CrispyCo', sub_category: 'Chips', product_type: 'Potato Chips' },
      { sku: 'SNACK-NUTS-ALMOND', name: 'Roasted Almonds', price: 499.00, stock: 150, brand: 'NuttyGood', sub_category: 'Nuts', product_type: 'Almonds' },
      { sku: 'SNACK-CRACKERS-CHEESE', name: 'Cheese Crackers', price: 299.00, stock: 180, brand: 'CrackerMax', sub_category: 'Crackers', product_type: 'Crackers' },
      { sku: 'SNACK-POPCORN-BUTTER', name: 'Butter Popcorn', price: 149.00, stock: 250, brand: 'PopMaster', sub_category: 'Popcorn', product_type: 'Popcorn' },
      { sku: 'SNACK-PRETZELS-SALTED', name: 'Salted Pretzels', price: 249.00, stock: 160, brand: 'PretzelPro', sub_category: 'Pretzels', product_type: 'Pretzels' },
      { sku: 'SNACK-TRAIL-MIX', name: 'Trail Mix Deluxe', price: 399.00, stock: 120, brand: 'TrailMaster', sub_category: 'Mixed Snacks', product_type: 'Trail Mix' },
      { sku: 'SNACK-COOKIES-CHOC', name: 'Chocolate Cookies', price: 349.00, stock: 140, brand: 'CookieCo', sub_category: 'Cookies', product_type: 'Cookies' },
      { sku: 'SNACK-GRANOLA-BARS', name: 'Granola Bars 6-pack', price: 449.00, stock: 100, brand: 'GranolaPro', sub_category: 'Bars', product_type: 'Granola Bar' },
      { sku: 'SNACK-DRIED-MANGO', name: 'Dried Mango Slices', price: 399.00, stock: 90, brand: 'FruitSnack', sub_category: 'Snacks', product_type: 'Dried Fruit' },
      { sku: 'SNACK-PISTACHIOS', name: 'Shelled Pistachios', price: 599.00, stock: 80, brand: 'PistachioPro', sub_category: 'Nuts', product_type: 'Pistachios' },
      { sku: 'SNACK-CASHEWS-ROASTED', name: 'Roasted Cashews', price: 449.00, stock: 110, brand: 'CashewCo', sub_category: 'Nuts', product_type: 'Cashews' },
      { sku: 'SNACK-RICE-CAKES', name: 'Brown Rice Cakes', price: 199.00, stock: 170, brand: 'RiceSnack', sub_category: 'Rice Snacks', product_type: 'Rice Cake' }
    ];

    for (const product of snacksProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,account_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images,product_type) SELECT u.user_id,a.account_id,'${product.name}','${product.sku}','${product.name} - Premium ${product.sub_category.toLowerCase()}','${product.brand}','Snacks','${product.sub_category}',${product.price},${product.stock},'{\\\"natural\\\":true,\\\"no_artificial\\\":true}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb,'${product.product_type}' FROM users u JOIN accounts a ON a.owner_user_id=u.user_id WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Peripherals - 12 products
    const peripheralsProducts = [
      { sku: 'PERI-MOUSE-GAMING', name: 'Gaming Mouse RGB', price: 2999.00, stock: 50, brand: 'GameMax', sub_category: 'Input Devices', product_type: 'Gaming Mouse' },
      { sku: 'PERI-KEYBOARD-MECH', name: 'Mechanical Keyboard', price: 3999.00, stock: 40, brand: 'KeyMaster', sub_category: 'Input Devices', product_type: 'Mechanical Keyboard' },
      { sku: 'PERI-MONITOR-27', name: '27-inch Gaming Monitor', price: 15999.00, stock: 25, brand: 'DisplayPro', sub_category: 'Display', product_type: 'Gaming Monitor' },
      { sku: 'PERI-WEBCAM-4K', name: '4K Webcam Pro', price: 6999.00, stock: 30, brand: 'StreamCam', sub_category: 'Video', product_type: 'Webcam' },
      { sku: 'PERI-SPEAKERS-2.1', name: '2.1 Speaker System', price: 4999.00, stock: 35, brand: 'AudioMax', sub_category: 'Audio', product_type: 'Speaker' },
      { sku: 'PERI-HEADPHONES-WIRELESS', name: 'Wireless Headphones', price: 5999.00, stock: 45, brand: 'SoundPro', sub_category: 'Audio', product_type: 'Wireless Headphones' },
      { sku: 'PERI-MICROPHONE-STREAM', name: 'Streaming Microphone', price: 3999.00, stock: 20, brand: 'MicPro', sub_category: 'Audio', product_type: 'USB Streaming Microphone' },
      { sku: 'PERI-DOCKING-STATION', name: 'USB-C Docking Station', price: 2999.00, stock: 60, brand: 'DockMax', sub_category: 'Connectivity', product_type: 'Laptop Docking Station' },
      { sku: 'PERI-CABLE-HDMI', name: 'HDMI Cable 2m', price: 999.00, stock: 100, brand: 'CablePro', sub_category: 'Cables', product_type: 'HDMI Cable' },
      { sku: 'PERI-USB-HUB', name: 'USB 3.0 Hub 4-port', price: 1499.00, stock: 80, brand: 'HubMax', sub_category: 'Connectivity', product_type: 'USB Hub' },
      { sku: 'PERI-GRAPHICS-TABLET', name: 'Drawing Graphics Tablet', price: 8999.00, stock: 15, brand: 'DrawPro', sub_category: 'Input Devices', product_type: 'Graphics Tablet' },
      { sku: 'PERI-LAPTOP-STAND', name: 'Adjustable Laptop Stand', price: 1999.00, stock: 70, brand: 'StandPro', sub_category: 'Cooling', product_type: 'Laptop Cooling Pad' }
    ];

    for (const product of peripheralsProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,account_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images,product_type) SELECT u.user_id,a.account_id,'${product.name}','${product.sku}','${product.name} - High quality ${product.sub_category.toLowerCase()}','${product.brand}','Peripherals','${product.sub_category}',${product.price},${product.stock},'{\\\"compatibility\\\":\\\"universal\\\",\\\"warranty\\\":\\\"1 year\\\"}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb,'${product.product_type}' FROM users u JOIN accounts a ON a.owner_user_id=u.user_id WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Fragrances - 12 products
    const fragrancesProducts = [
      { sku: 'FRAG-PERFUME-WOMEN', name: 'Womens Perfume 50ml', price: 2999.00, stock: 40, brand: 'Elegance', sub_category: 'Perfumes', product_type: 'Eau de Parfum' },
      { sku: 'FRAG-COLOGNE-MEN', name: 'Mens Cologne 100ml', price: 2499.00, stock: 50, brand: 'Masculine', sub_category: 'Colognes', product_type: 'Cologne' },
      { sku: 'FRAG-BODY-SPRAY', name: 'Body Spray Fresh', price: 899.00, stock: 80, brand: 'FreshSpray', sub_category: 'Body Sprays', product_type: 'Body Spray' },
      { sku: 'FRAG-DIFFUSER-REED', name: 'Reed Diffuser Set', price: 1299.00, stock: 60, brand: 'AromaHome', sub_category: 'Home Fragrances', product_type: 'Reed Diffuser' },
      { sku: 'FRAG-CANDLE-SCENTED', name: 'Scented Candle Vanilla', price: 699.00, stock: 100, brand: 'CandleCo', sub_category: 'Home Fragrances', product_type: 'Scented Candle' },
      { sku: 'FRAG-ROOM-SPRAY', name: 'Room Spray Lavender', price: 499.00, stock: 120, brand: 'RoomFresh', sub_category: 'Home Fragrances', product_type: 'Air Freshener' },
      { sku: 'FRAG-PERFUME-ROLL', name: 'Roll-on Perfume Oil', price: 1199.00, stock: 70, brand: 'RollOn', sub_category: 'Perfumes', product_type: 'Perfume Roller' },
      { sku: 'FRAG-SOAP-LUXURY', name: 'Luxury Scented Soap', price: 399.00, stock: 150, brand: 'SoapLux', sub_category: 'Body Care', product_type: 'Body Lotion' },
      { sku: 'FRAG-LOTION-BODY', name: 'Body Lotion Fragrant', price: 799.00, stock: 90, brand: 'LotionPro', sub_category: 'Body Care', product_type: 'Body Lotion' },
      { sku: 'FRAG-SHAMPOO-SCENTED', name: 'Scented Shampoo', price: 599.00, stock: 110, brand: 'HairCare', sub_category: 'Hair Care', product_type: 'Shampoo' },
      { sku: 'FRAG-DEO-STICK', name: 'Deodorant Stick', price: 299.00, stock: 200, brand: 'DeoMax', sub_category: 'Body Care', product_type: 'Body Mist' },
      { sku: 'FRAG-SACHET-CAR', name: 'Car Sachet Freshener', price: 199.00, stock: 180, brand: 'CarFresh', sub_category: 'Home Fragrances', product_type: 'Sachet' }
    ];

    for (const product of fragrancesProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,account_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images,product_type) SELECT u.user_id,a.account_id,'${product.name}','${product.sku}','${product.name} - Premium ${product.sub_category.toLowerCase()}','${product.brand}','Fragrances','${product.sub_category}',${product.price},${product.stock},'{\\\"long_lasting\\\":true,\\\"natural_ingredients\\\":true}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb,'${product.product_type}' FROM users u JOIN accounts a ON a.owner_user_id=u.user_id WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Computer Components - 12 products
    const componentsProducts = [
      { sku: 'COMP-RAM-16GB', name: '16GB DDR4 RAM', price: 4999.00, stock: 30, brand: 'MemoryMax', sub_category: 'Memory', product_type: 'RAM' },
      { sku: 'COMP-SSD-1TB', name: '1TB NVMe SSD', price: 6999.00, stock: 25, brand: 'StoragePro', sub_category: 'Storage', product_type: 'SSD' },
      { sku: 'COMP-GPU-RTX4060', name: 'RTX 4060 Graphics Card', price: 25999.00, stock: 15, brand: 'GraphicsMax', sub_category: 'Graphics', product_type: 'Graphics Card' },
      { sku: 'COMP-CPU-RYZEN7', name: 'Ryzen 7 Processor', price: 18999.00, stock: 20, brand: 'ProcessorPro', sub_category: 'Processors', product_type: 'Processor' },
      { sku: 'COMP-MOTHERBOARD-B550', name: 'B550 Motherboard', price: 8999.00, stock: 18, brand: 'BoardMax', sub_category: 'Motherboards', product_type: 'Motherboard' },
      { sku: 'COMP-PSU-750W', name: '750W Power Supply', price: 5999.00, stock: 22, brand: 'PowerMax', sub_category: 'Power', product_type: 'Power Supply' },
      { sku: 'COMP-COOLER-AIO', name: 'AIO Liquid Cooler', price: 3999.00, stock: 35, brand: 'CoolMax', sub_category: 'Cooling', product_type: 'CPU Cooler' },
      { sku: 'COMP-CASE-MID', name: 'Mid Tower Case', price: 2999.00, stock: 40, brand: 'CasePro', sub_category: 'Cases', product_type: 'Gaming Case' },
      { sku: 'COMP-FAN-120MM', name: '120mm Case Fan', price: 999.00, stock: 80, brand: 'FanMax', sub_category: 'Cooling', product_type: 'Case Fan' },
      { sku: 'COMP-CABLE-SATA', name: 'SATA Cable Set', price: 499.00, stock: 100, brand: 'CablePro', sub_category: 'Accessories', product_type: 'SATA Cable' },
      { sku: 'COMP-THERMAL-PASTE', name: 'Thermal Paste', price: 299.00, stock: 120, brand: 'ThermalPro', sub_category: 'Accessories', product_type: 'Thermal Paste' },
      { sku: 'COMP-SCREW-SET', name: 'PC Building Screw Set', price: 199.00, stock: 150, brand: 'HardwareMax', sub_category: 'Accessories', product_type: 'Hardware' }
    ];

    for (const product of componentsProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,account_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images,product_type) SELECT u.user_id,a.account_id,'${product.name}','${product.sku}','${product.name} - High performance ${product.sub_category.toLowerCase()}','${product.brand}','Computer Components','${product.sub_category}',${product.price},${product.stock},'{\\\"high_performance\\\":true,\\\"warranty\\\":\\\"2 years\\\"}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb,'${product.product_type}' FROM users u JOIN accounts a ON a.owner_user_id=u.user_id WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Hair Care - 12 products
    const hairCareProducts = [
      { sku: 'HAIR-SHAMPOO-CLEAR', name: 'Clarifying Shampoo', price: 699.00, stock: 80, brand: 'HairClear', sub_category: 'Shampoos', product_type: 'Shampoo' },
      { sku: 'HAIR-CONDITIONER-DEEP', name: 'Deep Conditioning Treatment', price: 899.00, stock: 70, brand: 'HairSoft', sub_category: 'Conditioners', product_type: 'Conditioner' },
      { sku: 'HAIR-MASK-REPAIR', name: 'Repair Hair Mask', price: 1199.00, stock: 60, brand: 'HairRepair', sub_category: 'Masks', product_type: 'Hair Mask' },
      { sku: 'HAIR-SERUM-ANTI-FRIZZ', name: 'Anti-Frizz Serum', price: 799.00, stock: 90, brand: 'FrizzFree', sub_category: 'Serums', product_type: 'Hair Serum' },
      { sku: 'HAIR-OIL-ARGAN', name: 'Argan Oil Treatment', price: 999.00, stock: 50, brand: 'OilPro', sub_category: 'Treatments', product_type: 'Hair Oil' },
      { sku: 'HAIR-SPRAY-HOLD', name: 'Strong Hold Hair Spray', price: 599.00, stock: 100, brand: 'HoldMax', sub_category: 'Styling', product_type: 'Hair Spray' },
      { sku: 'HAIR-GEL-STYLING', name: 'Styling Gel', price: 399.00, stock: 120, brand: 'StyleGel', sub_category: 'Styling', product_type: 'Styling Gel' },
      { sku: 'HAIR-MOUSSE-VOLUME', name: 'Volume Mousse', price: 499.00, stock: 85, brand: 'VolumeMax', sub_category: 'Styling', product_type: 'Volumizing Foam' },
      { sku: 'HAIR-BRUSH-DETANGLE', name: 'Detangling Brush', price: 299.00, stock: 150, brand: 'BrushPro', sub_category: 'Accessories', product_type: 'Hair Brush' },
      { sku: 'HAIR-DRYER-PROFESSIONAL', name: 'Professional Hair Dryer', price: 2999.00, stock: 25, brand: 'DryPro', sub_category: 'Tools', product_type: 'Hair Dryer' },
      { sku: 'HAIR-STRAIGHTENER-CERAMIC', name: 'Ceramic Straightener', price: 1999.00, stock: 30, brand: 'StraightPro', sub_category: 'Tools', product_type: 'Hair Straightener' },
      { sku: 'HAIR-CURLER-WAND', name: 'Curling Wand Set', price: 1499.00, stock: 35, brand: 'CurlPro', sub_category: 'Tools', product_type: 'Hair Straightener' }
    ];

    for (const product of hairCareProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,account_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images,product_type) SELECT u.user_id,a.account_id,'${product.name}','${product.sku}','${product.name} - Professional ${product.sub_category.toLowerCase()}','${product.brand}','Hair Care','${product.sub_category}',${product.price},${product.stock},'{\\\"professional_grade\\\":true,\\\"salon_quality\\\":true}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb,'${product.product_type}' FROM users u JOIN accounts a ON a.owner_user_id=u.user_id WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Baking Supplies - 12 products
    const bakingProducts = [
      { sku: 'BAKE-FLOUR-ALL-PURPOSE', name: 'All-Purpose Flour 2kg', price: 299.00, stock: 100, brand: 'FlourMax', sub_category: 'Flour', product_type: 'All-Purpose Flour' },
      { sku: 'BAKE-SUGAR-GRANULATED', name: 'Granulated Sugar 1kg', price: 199.00, stock: 150, brand: 'SugarPro', sub_category: 'Sugar', product_type: 'White Sugar' },
      { sku: 'BAKE-BUTTER-UNSALTED', name: 'Unsalted Butter 500g', price: 399.00, stock: 80, brand: 'ButterCo', sub_category: 'Dairy', product_type: 'Butter' },
      { sku: 'BAKE-EGGS-FRESH', name: 'Fresh Eggs 12-pack', price: 249.00, stock: 120, brand: 'EggFarm', sub_category: 'Egg Products', product_type: 'Egg' },
      { sku: 'BAKE-VANILLA-EXTRACT', name: 'Pure Vanilla Extract', price: 599.00, stock: 60, brand: 'VanillaPro', sub_category: 'Extracts', product_type: 'Vanilla Extract' },
      { sku: 'BAKE-BAKING-POWDER', name: 'Baking Powder 200g', price: 149.00, stock: 200, brand: 'BakeRise', sub_category: 'Leavening', product_type: 'Baking Powder' },
      { sku: 'BAKE-COCOA-POWDER', name: 'Cocoa Powder 250g', price: 349.00, stock: 90, brand: 'CocoaMax', sub_category: 'Cocoa', product_type: 'Cocoa Powder' },
      { sku: 'BAKE-CHOCOLATE-CHIPS', name: 'Chocolate Chips 300g', price: 449.00, stock: 110, brand: 'ChipCo', sub_category: 'Mix-ins', product_type: 'Chocolate Chips' },
      { sku: 'BAKE-MIXING-BOWL', name: 'Stainless Steel Mixing Bowl', price: 799.00, stock: 40, brand: 'BowlPro', sub_category: 'Accessories', product_type: 'Mixing Bowl' },
      { sku: 'BAKE-WHISK-HAND', name: 'Hand Whisk', price: 299.00, stock: 70, brand: 'WhiskMax', sub_category: 'Accessories', product_type: 'Whisk' },
      { sku: 'BAKE-MEASURING-CUPS', name: 'Measuring Cups Set', price: 399.00, stock: 50, brand: 'MeasurePro', sub_category: 'Accessories', product_type: 'Measuring Cups' },
      { sku: 'BAKE-PARCHMENT-PAPER', name: 'Parchment Paper Roll', price: 199.00, stock: 130, brand: 'PaperPro', sub_category: 'Accessories', product_type: 'Paper' }
    ];

    for (const product of bakingProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,account_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images,product_type) SELECT u.user_id,a.account_id,'${product.name}','${product.sku}','${product.name} - Premium ${product.sub_category.toLowerCase()}','${product.brand}','Baking Supplies','${product.sub_category}',${product.price},${product.stock},'{\\\"food_grade\\\":true,\\\"fresh\\\":true}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb,'${product.product_type}' FROM users u JOIN accounts a ON a.owner_user_id=u.user_id WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Gaming - 11 products
    const gamingProducts = [
      { sku: 'GAME-CONTROLLER-XBOX', name: 'Xbox Controller', price: 3999.00, stock: 30, brand: 'GamePad', sub_category: 'Controllers', product_type: 'Wireless Controller' },
      { sku: 'GAME-HEADSET-GAMING', name: 'Gaming Headset RGB', price: 2999.00, stock: 40, brand: 'GameAudio', sub_category: 'Audio', product_type: 'Gaming Headset' },
      { sku: 'GAME-MOUSE-PAD', name: 'Gaming Mouse Pad', price: 999.00, stock: 80, brand: 'PadPro', sub_category: 'Accessories', product_type: 'Gaming Mouse Pad' },
      { sku: 'GAME-KEYBOARD-MECH', name: 'Mechanical Gaming Keyboard', price: 4999.00, stock: 25, brand: 'KeyGame', sub_category: 'Peripherals', product_type: 'Mechanical Keyboard' },
      { sku: 'GAME-MOUSE-GAMING', name: 'Gaming Mouse 16000 DPI', price: 2499.00, stock: 35, brand: 'MouseGame', sub_category: 'Peripherals', product_type: 'Gaming Mouse' },
      { sku: 'GAME-MONITOR-144HZ', name: '144Hz Gaming Monitor', price: 18999.00, stock: 15, brand: 'MonitorGame', sub_category: 'Display', product_type: 'Gaming Monitor' },
      { sku: 'GAME-CHAIR-RACING', name: 'Racing Gaming Chair', price: 12999.00, stock: 20, brand: 'ChairGame', sub_category: 'Furniture', product_type: 'Gaming Chair' },
      { sku: 'GAME-DESK-GAMING', name: 'Gaming Desk', price: 8999.00, stock: 12, brand: 'DeskGame', sub_category: 'Furniture', product_type: 'Gaming Desk' },
      { sku: 'GAME-LED-STRIP', name: 'RGB LED Strip', price: 1499.00, stock: 60, brand: 'LEDGame', sub_category: 'Lighting', product_type: 'LED Strip' },
      { sku: 'GAME-CABLE-MANAGEMENT', name: 'Cable Management Kit', price: 799.00, stock: 100, brand: 'CableGame', sub_category: 'Accessories', product_type: 'Cable Kit' },
      { sku: 'GAME-WRIST-REST', name: 'Gaming Wrist Rest', price: 599.00, stock: 90, brand: 'RestGame', sub_category: 'Accessories', product_type: 'Wrist Rest' }
    ];

    for (const product of gamingProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,account_id,name,sku,description,brand,category,subcategory,price,stock,attributes,images,product_type) SELECT u.user_id,a.account_id,'${product.name}','${product.sku}','${product.name} - Professional ${product.sub_category.toLowerCase()}','${product.brand}','Gaming','${product.sub_category}',${product.price},${product.stock},'{\\\"gaming_optimized\\\":true,\\\"rgb_lighting\\\":true}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb,'${product.product_type}' FROM users u JOIN accounts a ON a.owner_user_id=u.user_id WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Drinks - 7 products
    const drinksProducts = [
      { sku: 'DRINK-COFFEE-BEANS', name: 'Premium Coffee Beans', price: 899.00, stock: 50, brand: 'BeanMax', sub_category: 'Beverages', product_type: 'Coffee' },
      { sku: 'DRINK-TEA-GREEN', name: 'Green Tea Bags', price: 299.00, stock: 100, brand: 'TeaLeaf', sub_category: 'Beverages', product_type: 'Tea' },
      { sku: 'DRINK-JUICE-ORANGE', name: 'Fresh Orange Juice', price: 199.00, stock: 80, brand: 'JuiceFresh', sub_category: 'Beverages', product_type: 'Juice' },
      { sku: 'DRINK-WATER-SPARKLING', name: 'Sparkling Water', price: 149.00, stock: 120, brand: 'WaterBubble', sub_category: 'Beverages', product_type: 'Sparkling Water' },
      { sku: 'DRINK-ENERGY-NATURAL', name: 'Natural Energy Drink', price: 249.00, stock: 90, brand: 'EnergyNatural', sub_category: 'Beverages', product_type: 'Energy Drink' },
      { sku: 'DRINK-SMOOTHIE-MIX', name: 'Smoothie Mix Pack', price: 399.00, stock: 70, brand: 'SmoothiePro', sub_category: 'Beverages', product_type: 'Smoothie Mix' },
      { sku: 'DRINK-COLD-BREW', name: 'Cold Brew Coffee', price: 349.00, stock: 60, brand: 'BrewCold', sub_category: 'Beverages', product_type: 'Coffee' }
    ];

    for (const product of drinksProducts) {
      execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category,subcategory,product_type,price,stock,attributes,images) SELECT u.user_id,'${product.name}','${product.sku}','${product.name} - Premium ${product.sub_category.toLowerCase()}','${product.brand}','Drinks','${product.sub_category}','${product.product_type}',${product.price},${product.stock},'{\\\"natural\\\":true,\\\"refreshing\\\":true}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb FROM users u WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }
    // Accounts for demo owners
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO accounts (owner_user_id,name,status) SELECT u.user_id,'Electra Shop','active' FROM users u WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.owner_user_id=u.user_id);"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO accounts (owner_user_id,name,status) SELECT u.user_id,'Cosma Beauty','active' FROM users u WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.owner_user_id=u.user_id);"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO accounts (owner_user_id,name,status) SELECT u.user_id,'Gusto Bites','active' FROM users u WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.owner_user_id=u.user_id);"`, { stdio: 'inherit' });

    // Shops per account
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,products_count,followers_count,following_count,chat_performance_percent,rating_value,rating_count,joined_at,metadata) SELECT a.account_id,'Electra Main','shopee','SHP-ELECTRA','https://shopee.ph/electra','active',0,13600,3,96.0,4.9,23800,NOW() - INTERVAL '6 years','{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='shopee');"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,products_count,followers_count,following_count,chat_performance_percent,rating_value,rating_count,joined_at,metadata) SELECT a.account_id,'Cosma Main','lazada','LZD-COSMA','https://www.lazada.com.ph/shop/cosma','active',0,12000,5,95.0,4.8,15000,NOW() - INTERVAL '4 years','{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='lazada');"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,products_count,followers_count,following_count,chat_performance_percent,rating_value,rating_count,joined_at,metadata) SELECT a.account_id,'Gusto Main','tiktok','TT-GUSTO','https://www.tiktok.com/@gustobites','active',0,8000,2,97.0,4.9,9000,NOW() - INTERVAL '2 years','{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='tiktok');"`, { stdio: 'inherit' });

    // Additional shops with varied followers
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,followers_count,metadata) SELECT a.account_id,'Electra Main','lazada','LZD-ELECTRA','https://www.lazada.com.ph/shop/electra','active',9800,'{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='lazada');"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,followers_count,metadata) SELECT a.account_id,'Electra Main','tiktok','TT-ELECTRA','https://www.tiktok.com/@electra','active',15400,'{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='tiktok');"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,followers_count,metadata) SELECT a.account_id,'Cosma Main','shopee','SHP-COSMA','https://shopee.ph/cosma','active',11000,'{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='shopee');"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,followers_count,metadata) SELECT a.account_id,'Cosma Main','tiktok','TT-COSMA','https://www.tiktok.com/@cosma','active',9000,'{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='tiktok');"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,followers_count,metadata) SELECT a.account_id,'Gusto Main','shopee','SHP-GUSTO','https://shopee.ph/gustobites','active',7000,'{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='shopee');"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO shops (account_id,name,platform,platform_shop_id,url,status,followers_count,metadata) SELECT a.account_id,'Gusto Main','lazada','LZD-GUSTO','https://www.lazada.com.ph/shop/gusto-bites','active',6200,'{}'::jsonb FROM accounts a JOIN users u ON a.owner_user_id=u.user_id WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.account_id=a.account_id AND s.platform='lazada');"`, { stdio: 'inherit' });

    // Product listings linking (Docker path) with listing stock and promo fields
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO product_listings (product_id,account_id,shop_id,platform,platform_product_id,title,listing_price,listing_special_price,listing_stock,currency,listing_status,promo_start,promo_end) SELECT p.product_id,a.account_id,s.shop_id,'shopee',p.sku,p.name, p.price*0.97, CASE WHEN RANDOM() < 0.4 THEN (p.price*0.90) ELSE NULL END, FLOOR(RANDOM()*150+20)::int, 'PHP','active', CASE WHEN RANDOM() < 0.3 THEN NOW() ELSE NULL END, CASE WHEN RANDOM() < 0.3 THEN NOW()+INTERVAL '7 days' ELSE NULL END FROM products p JOIN users u ON p.owner_user_id=u.user_id JOIN accounts a ON a.owner_user_id=u.user_id JOIN shops s ON s.account_id=a.account_id AND s.platform='shopee' WHERE u.email='electronics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM product_listings pl WHERE pl.product_id=p.product_id AND pl.platform='shopee');"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO product_listings (product_id,account_id,shop_id,platform,platform_product_id,title,listing_price,listing_special_price,listing_stock,currency,listing_status,promo_start,promo_end) SELECT p.product_id,a.account_id,s.shop_id,'lazada',p.sku,p.name, p.price*1.02, CASE WHEN RANDOM() < 0.35 THEN (p.price*0.92) ELSE NULL END, FLOOR(RANDOM()*180+30)::int, 'PHP','active', CASE WHEN RANDOM() < 0.25 THEN NOW() ELSE NULL END, CASE WHEN RANDOM() < 0.25 THEN NOW()+INTERVAL '10 days' ELSE NULL END FROM products p JOIN users u ON p.owner_user_id=u.user_id JOIN accounts a ON a.owner_user_id=u.user_id JOIN shops s ON s.account_id=a.account_id AND s.platform='lazada' WHERE u.email='cosmetics.owner@example.com' AND NOT EXISTS (SELECT 1 FROM product_listings pl WHERE pl.product_id=p.product_id AND pl.platform='lazada');"`, { stdio: 'inherit' });
    execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO product_listings (product_id,account_id,shop_id,platform,platform_product_id,title,listing_price,listing_special_price,listing_stock,currency,listing_status,promo_start,promo_end) SELECT p.product_id,a.account_id,s.shop_id,'tiktok',p.sku,p.name, p.price*0.93, CASE WHEN RANDOM() < 0.5 THEN (p.price*0.88) ELSE NULL END, FLOOR(RANDOM()*120+10)::int, 'PHP','active', CASE WHEN RANDOM() < 0.4 THEN NOW() ELSE NULL END, CASE WHEN RANDOM() < 0.4 THEN NOW()+INTERVAL '5 days' ELSE NULL END FROM products p JOIN users u ON p.owner_user_id=u.user_id JOIN accounts a ON a.owner_user_id=u.user_id JOIN shops s ON s.account_id=a.account_id AND s.platform='tiktok' WHERE u.email='food.owner@example.com' AND NOT EXISTS (SELECT 1 FROM product_listings pl WHERE pl.product_id=p.product_id AND pl.platform='tiktok');"`, { stdio: 'inherit' });

    // Generate sales data for Docker
    console.log('🔄 Generating sales data...');
    
    // Get all products with their account info
    const productsResult = execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "SELECT p.product_id, p.account_id, p.price, s.shop_id FROM products p JOIN shops s ON s.account_id = p.account_id ORDER BY p.product_id;"`, { encoding: 'utf8' });
    const products = productsResult.trim().split('\n').slice(2, -2).map(line => {
      const [product_id, account_id, price, shop_id] = line.split('|').map(x => x.trim());
      return { product_id: parseInt(product_id), account_id: parseInt(account_id), price: parseFloat(price), shop_id: parseInt(shop_id) };
    }).filter(product => product.product_id && product.account_id && product.price && product.shop_id);

    if (products.length === 0) {
      console.log('⚠️ No products found, skipping sales data generation');
      return true;
    }

    const platforms = ['tiktok', 'shopee', 'lazada'];
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-11-30');

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const saleDate = d.toISOString().split('T')[0];
      
      // Generate 5-15 sales per day
      const numSales = Math.floor(Math.random() * 20) + 5;
      
      for (let i = 0; i < numSales; i++) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        
        // Safety check to ensure we have a valid product
        if (!randomProduct || !randomProduct.price || !randomProduct.account_id || !randomProduct.product_id || !randomProduct.shop_id) {
          console.log(`⚠️ Skipping invalid product at index ${i}`);
          continue;
        }
        
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const unitPrice = randomProduct.price * (0.8 + Math.random() * 0.4); // 80-120% of base price
        const totalSales = unitPrice * quantity;
        const orderId = `ORD-${saleDate.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`;

        try {
          execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "INSERT INTO product_sales (account_id, product_id, shop_id, platform, sale_date, quantity_sold, unit_price, total_sales, order_id) VALUES (${randomProduct.account_id}, ${randomProduct.product_id}, ${randomProduct.shop_id}, '${platform}', '${saleDate}', ${quantity}, ${unitPrice.toFixed(2)}, ${totalSales.toFixed(2)}, '${orderId}');"`, { stdio: 'inherit' });
        } catch (error) {
          console.log(`⚠️ Failed to insert sale for product ${randomProduct.product_id}: ${error.message}`);
        }
      }
    }


    console.log('✅ Seeded roles, permissions, users, products, accounts, shops, listings, and sales data via Docker');
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


