#!/usr/bin/env node

/**
 * Populate database with roles, permissions, users, products, and taxonomy data
 * Roles: business_owner, admin, system_admin
 * Permissions: create, read, update, deactivate, view_dashboard, view_products, view_insights
 * Taxonomy: categories, subcategories, product_types
 * Uses Docker PostgreSQL container
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

function checkDockerPostgresRunning() {
  try {
    const out = execSync('docker ps --filter "name=postgres" --format "{{.Names}}"', { encoding: 'utf8' });
    return out.includes('postgres') || out.includes('datadrip');
  } catch { return false; }
}

function getDatabaseConfig() {
  // Prefer DATABASE_URL (Railway/tunnel). Use SSL but allow self-signed.
  if (process.env.DATABASE_URL) {
    console.log('🔗 Using DATABASE_URL environment variable');
    return { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } };
  }
  
  // Default to Docker PostgreSQL configuration
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

// Seed taxonomy data
async function seedTaxonomyData(pool) {
  try {
    console.log('Seeding taxonomy data...');
    
    // Create taxonomy tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subcategories (
        subcategory_id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES categories(category_id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (category_id, name)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_types (
        product_type_id SERIAL PRIMARY KEY,
        subcategory_id INTEGER REFERENCES subcategories(subcategory_id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (subcategory_id, name)
      );
    `);
    
    // Categories
    const categories = [
      { name: 'Electronics', order: 1 },
      { name: 'Fashion & Clothing', order: 2 },
      { name: 'Beauty & Cosmetics', order: 3 },
      { name: 'Home & Garden', order: 4 },
      { name: 'Sports & Outdoors', order: 5 },
      { name: 'Health & Wellness', order: 6 },
      { name: 'Toys & Games', order: 7 },
      { name: 'Books & Media', order: 8 },
      { name: 'Automotive', order: 9 },
      { name: 'Food & Beverages', order: 10 },
      { name: 'Baby & Kids', order: 11 },
      { name: 'Pet Supplies', order: 12 },
      { name: 'Office Supplies', order: 13 },
      { name: 'Jewelry & Accessories', order: 14 },
      { name: 'Art & Crafts', order: 15 },
      { name: 'Travel & Luggage', order: 16 },
      { name: 'Industrial & Scientific', order: 17 }
    ];

    for (const cat of categories) {
      await pool.query(`
        INSERT INTO categories (name, display_order, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO NOTHING
      `, [cat.name, cat.order, `Products in the ${cat.name} category`]);
    }

    // Get inserted categories to use their IDs
    const categoryMap = new Map();
    const catResults = await pool.query('SELECT category_id, name FROM categories');
    catResults.rows.forEach(row => categoryMap.set(row.name, row.category_id));

    // Subcategories (matching init-db.js - 17 categories)
    const subcategories = {
      'Electronics': ['TV & Video', 'Audio', 'Mobile', 'Computers', 'Tablets', 'Cameras', 'Wearables', 'Accessories', 'Monitors', 'Networking'],
      'Fashion & Clothing': ["Men's Clothing", "Women's Clothing", "Kids' Clothing", 'Shoes', 'Accessories', 'Underwear', 'Swimwear', 'Activewear'],
      'Beauty & Cosmetics': ['Skincare', 'Makeup', 'Hair Care', 'Fragrance', 'Personal Care', 'Tools & Brushes'],
      'Home & Garden': ['Furniture', 'Decor', 'Kitchen & Dining', 'Bedding', 'Bath', 'Garden Tools', 'Plants & Seeds', 'Lighting'],
      'Sports & Outdoors': ['Fitness Equipment', 'Outdoor Gear', 'Team Sports', 'Water Sports', 'Winter Sports', 'Cycling', 'Running', 'Yoga & Pilates'],
      'Health & Wellness': ['Supplements', 'Medical Supplies', 'Fitness Equipment', 'Personal Care', 'Therapy & Recovery', 'Monitoring Devices'],
      'Toys & Games': ['Action Figures', 'Board Games', 'Puzzles', 'Educational Toys', 'Outdoor Toys', 'Electronic Toys', 'Arts & Crafts'],
      'Books & Media': ['Books', 'Magazines', 'Digital Media', 'Music', 'Movies & TV', 'Video Games'],
      'Automotive': ['Car Parts', 'Accessories', 'Tools', 'Maintenance', 'Interior', 'Exterior'],
      'Food & Beverages': ['Beverages', 'Snacks', 'Breakfast', 'Supplements', 'Confectionery', 'Sweeteners', 'Seasonings'],
      'Baby & Kids': ['Baby Care', 'Feeding', 'Nursery', 'Safety', 'Toys', 'Clothing'],
      'Pet Supplies': ['Dog Supplies', 'Cat Supplies', 'Fish Supplies', 'Bird Supplies', 'Small Pet Supplies', 'Pet Food'],
      'Office Supplies': ['Stationery', 'Furniture', 'Technology', 'Storage', 'Presentation', 'Organization'],
      'Jewelry & Accessories': ['Necklaces', 'Rings', 'Earrings', 'Bracelets', 'Watches', 'Bags', 'Belts'],
      'Art & Crafts': ['Drawing Supplies', 'Painting', 'Sculpting', 'Crafting', 'Paper Crafts', 'Fabric Crafts'],
      'Travel & Luggage': ['Luggage', 'Travel Accessories', 'Travel Gear', 'Bags & Backpacks'],
      'Industrial & Scientific': ['Tools', 'Measuring Instruments', 'Safety Equipment', 'Lab Supplies']
    };

    const subcategoryMap = new Map();
    for (const [catName, subcats] of Object.entries(subcategories)) {
      const catId = categoryMap.get(catName);
      if (catId) {
        for (let i = 0; i < subcats.length; i++) {
          const result = await pool.query(`
            INSERT INTO subcategories (category_id, name, display_order)
            VALUES ($1, $2, $3)
            ON CONFLICT (category_id, name) DO NOTHING
            RETURNING subcategory_id, name
          `, [catId, subcats[i], i + 1]);
          
          if (result.rows.length > 0) {
            subcategoryMap.set(`${catName}::${subcats[i]}`, result.rows[0].subcategory_id);
          }
        }
      }
    }

    // Product Types (comprehensive data for all subcategories)
    const productTypes = {
      'Electronics::TV & Video': ['Smart TVs', 'LED TVs', 'OLED TVs', 'Projectors', 'Streaming Devices', 'TV Accessories'],
      'Electronics::Audio': ['Headphones', 'Speakers', 'Earbuds', 'Microphones', 'Audio Cables', 'Amplifiers'],
      'Electronics::Mobile': ['Smartphones', 'Feature Phones', 'Mobile Accessories', 'Cases & Covers', 'Screen Protectors', 'Chargers'],
      'Electronics::Computers': ['Laptops', 'Desktops', 'Tablets', 'Computer Accessories', 'Monitors', 'Keyboards'],
      'Electronics::Gaming': ['Gaming Consoles', 'Gaming PCs', 'Gaming Accessories', 'Gaming Chairs', 'Gaming Headsets', 'Controllers'],
      'Fashion & Clothing::Men\'s Clothing': ['T-Shirts', 'Shirts', 'Pants', 'Jeans', 'Jackets', 'Suits'],
      'Fashion & Clothing::Women\'s Clothing': ['Dresses', 'Tops', 'Blouses', 'Skirts', 'Pants', 'Outerwear'],
      'Fashion & Clothing::Kids\' Clothing': ['Baby Clothes', 'Toddler Clothes', 'Kids Tops', 'Kids Bottoms', 'Kids Dresses', 'Kids Outerwear'],
      'Fashion & Clothing::Shoes': ['Men\'s Shoes', 'Women\'s Shoes', 'Kids\' Shoes', 'Sports Shoes', 'Casual Shoes', 'Formal Shoes'],
      'Fashion & Clothing::Socks': ['Men\'s Socks', 'Women\'s Socks', 'Kids\' Socks', 'Athletic Socks', 'Work Socks', 'Casual Socks'],
      'Beauty & Cosmetics::Skincare': ['Face Wash', 'Moisturizers', 'Serums', 'Masks', 'Sun Protection', 'Anti-Aging'],
      'Beauty & Cosmetics::Makeup': ['Foundation', 'Lipstick', 'Eyeshadow', 'Mascara', 'Blush', 'Concealer'],
      'Beauty & Cosmetics::Hair Care': ['Shampoo', 'Conditioner', 'Hair Styling', 'Hair Tools', 'Hair Treatments', 'Hair Accessories'],
      'Beauty & Cosmetics::Fragrance': ['Perfumes', 'Colognes', 'Body Sprays', 'Essential Oils', 'Scented Candles', 'Room Fragrances'],
      'Beauty & Cosmetics::Nail Care': ['Nail Polish', 'Nail Tools', 'Nail Treatments', 'Nail Art', 'Manicure Sets', 'Nail Accessories'],
      'Home & Garden::Furniture': ['Sofas', 'Tables', 'Chairs', 'Beds', 'Storage', 'Office Furniture'],
      'Home & Garden::Home Decor': ['Wall Art', 'Decorative Items', 'Candles', 'Vases', 'Mirrors', 'Clocks'],
      'Home & Garden::Kitchen & Dining': ['Cookware', 'Dinnerware', 'Kitchen Tools', 'Small Appliances', 'Storage Containers', 'Tableware'],
      'Home & Garden::Bedding': ['Bed Sheets', 'Pillows', 'Comforters', 'Blankets', 'Mattress Toppers', 'Bedding Sets'],
      'Home & Garden::Bath': ['Towels', 'Bath Mats', 'Shower Curtains', 'Bath Accessories', 'Bathroom Storage', 'Bathroom Decor'],
      'Sports & Outdoors::Fitness Equipment': ['Weights', 'Mats', 'Resistance Bands', 'Cardio Equipment', 'Yoga Props', 'Fitness Accessories'],
      'Sports & Outdoors::Team Sports': ['Basketball', 'Soccer', 'Football', 'Baseball', 'Tennis', 'Volleyball'],
      'Sports & Outdoors::Outdoor Recreation': ['Camping Gear', 'Hiking Equipment', 'Fishing Gear', 'Outdoor Clothing', 'Backpacks', 'Outdoor Accessories'],
      'Sports & Outdoors::Water Sports': ['Swimming Gear', 'Water Sports Equipment', 'Pool Accessories', 'Beach Gear', 'Water Safety', 'Aquatic Fitness'],
      'Sports & Outdoors::Winter Sports': ['Skiing Equipment', 'Snowboarding Gear', 'Winter Clothing', 'Ice Skating', 'Winter Accessories', 'Cold Weather Gear'],
      'Food & Beverages::Beverages': ['Water', 'Juice', 'Coffee', 'Tea', 'Energy Drinks', 'Soft Drinks'],
      'Food & Beverages::Snacks': ['Chips', 'Crackers', 'Nuts', 'Dried Fruits', 'Candy', 'Healthy Snacks'],
      'Food & Beverages::Pantry Staples': ['Rice', 'Pasta', 'Canned Goods', 'Spices', 'Cooking Oils', 'Baking Ingredients'],
      'Food & Beverages::Frozen Foods': ['Frozen Meals', 'Frozen Vegetables', 'Ice Cream', 'Frozen Desserts', 'Frozen Snacks', 'Frozen Beverages'],
      'Food & Beverages::Fresh Produce': ['Fruits', 'Vegetables', 'Herbs', 'Organic Produce', 'Seasonal Items', 'Fresh Herbs'],
      'Health & Wellness::Supplements': ['Vitamins', 'Minerals', 'Protein Supplements', 'Herbal Supplements', 'Sports Nutrition', 'Health Supplements'],
      'Health & Wellness::Medical Supplies': ['First Aid', 'Medical Devices', 'Health Monitors', 'Therapeutic Equipment', 'Medical Accessories', 'Health Tools'],
      'Health & Wellness::Personal Care': ['Oral Care', 'Hair Care', 'Skin Care', 'Body Care', 'Personal Hygiene', 'Wellness Products'],
      'Health & Wellness::Fitness & Exercise': ['Exercise Equipment', 'Fitness Accessories', 'Workout Gear', 'Fitness Apps', 'Exercise Programs', 'Fitness Tracking'],
      'Health & Wellness::Mental Health': ['Stress Relief', 'Meditation', 'Sleep Aids', 'Relaxation Products', 'Mental Wellness', 'Mindfulness Tools'],
      'Automotive::Car Parts': ['Engine Parts', 'Brake Parts', 'Suspension Parts', 'Electrical Parts', 'Body Parts', 'Interior Parts'],
      'Automotive::Car Accessories': ['Car Electronics', 'Car Interior', 'Car Exterior', 'Car Safety', 'Car Maintenance', 'Car Cleaning'],
      'Automotive::Motorcycle': ['Motorcycle Parts', 'Motorcycle Accessories', 'Motorcycle Gear', 'Motorcycle Maintenance', 'Motorcycle Safety', 'Motorcycle Storage'],
      'Automotive::Truck & Commercial': ['Truck Parts', 'Commercial Vehicle Parts', 'Heavy Duty Parts', 'Commercial Accessories', 'Fleet Maintenance', 'Commercial Tools'],
      'Automotive::RV & Trailer': ['RV Parts', 'Trailer Parts', 'RV Accessories', 'Trailer Accessories', 'RV Maintenance', 'Camping Vehicles'],
      'Books & Media::Books': ['Fiction', 'Non-Fiction', 'Textbooks', 'Children\'s Books', 'Reference Books', 'E-Books'],
      'Books & Media::Movies & TV': ['DVDs', 'Blu-rays', 'Digital Movies', 'TV Shows', 'Documentaries', 'Streaming Content'],
      'Books & Media::Music': ['CDs', 'Vinyl Records', 'Digital Music', 'Musical Instruments', 'Music Accessories', 'Audio Equipment'],
      'Books & Media::Video Games': ['Console Games', 'PC Games', 'Mobile Games', 'Gaming Accessories', 'Gaming Consoles', 'Gaming Software'],
      'Books & Media::Magazines': ['Fashion Magazines', 'Tech Magazines', 'Lifestyle Magazines', 'News Magazines', 'Specialty Magazines', 'Digital Magazines'],
      'Toys & Games::Action Figures': ['Superhero Figures', 'Movie Figures', 'Collectible Figures', 'Action Figure Accessories', 'Figure Sets', 'Collectible Toys'],
      'Toys & Games::Board Games': ['Strategy Games', 'Family Games', 'Party Games', 'Educational Games', 'Card Games', 'Puzzle Games'],
      'Toys & Games::Electronic Toys': ['Interactive Toys', 'Educational Toys', 'Remote Control Toys', 'Electronic Games', 'Smart Toys', 'Tech Toys'],
      'Toys & Games::Outdoor Toys': ['Playground Equipment', 'Sports Toys', 'Water Toys', 'Ride-On Toys', 'Outdoor Games', 'Active Toys'],
      'Toys & Games::Arts & Crafts': ['Art Supplies', 'Craft Materials', 'DIY Kits', 'Creative Tools', 'Art Accessories', 'Crafting Sets'],
      'Pet Supplies::Dogs': ['Dog Food', 'Dog Toys', 'Dog Accessories', 'Dog Grooming', 'Dog Health', 'Dog Training'],
      'Pet Supplies::Cats': ['Cat Food', 'Cat Toys', 'Cat Accessories', 'Cat Grooming', 'Cat Health', 'Cat Training'],
      'Pet Supplies::Fish & Aquatics': ['Fish Food', 'Aquarium Equipment', 'Fish Accessories', 'Aquatic Plants', 'Water Treatment', 'Aquarium Decor'],
      'Pet Supplies::Birds': ['Bird Food', 'Bird Cages', 'Bird Toys', 'Bird Accessories', 'Bird Health', 'Bird Care'],
      'Pet Supplies::Small Animals': ['Small Pet Food', 'Small Pet Cages', 'Small Pet Toys', 'Small Pet Accessories', 'Small Pet Health', 'Small Pet Care'],
      'Baby & Kids::Baby Gear': ['Strollers', 'Car Seats', 'Baby Carriers', 'High Chairs', 'Baby Monitors', 'Baby Safety'],
      'Baby & Kids::Nursery': ['Cribs', 'Changing Tables', 'Nursery Decor', 'Baby Bedding', 'Nursery Storage', 'Baby Furniture'],
      'Baby & Kids::Feeding': ['Baby Bottles', 'Baby Food', 'Feeding Accessories', 'High Chairs', 'Baby Utensils', 'Feeding Supplies'],
      'Baby & Kids::Diapering': ['Diapers', 'Diaper Bags', 'Changing Pads', 'Diaper Accessories', 'Potty Training', 'Diapering Supplies'],
      'Baby & Kids::Baby Care': ['Baby Bath', 'Baby Health', 'Baby Grooming', 'Baby Safety', 'Baby Care Products', 'Baby Essentials'],
      'Office & School::Office Supplies': ['Writing Supplies', 'Paper Products', 'Office Equipment', 'Filing Supplies', 'Office Accessories', 'Desk Organizers'],
      'Office & School::School Supplies': ['Backpacks', 'School Bags', 'Notebooks', 'Pens & Pencils', 'Art Supplies', 'School Accessories'],
      'Office & School::Electronics': ['Computers', 'Printers', 'Scanners', 'Office Software', 'Computer Accessories', 'Office Technology'],
      'Office & School::Furniture': ['Desks', 'Chairs', 'Filing Cabinets', 'Office Storage', 'Conference Tables', 'Office Furniture'],
      'Office & School::Business': ['Business Cards', 'Presentation Materials', 'Office Decor', 'Business Supplies', 'Professional Tools', 'Office Solutions'],
    };

    for (const [key, types] of Object.entries(productTypes)) {
      const subcatId = subcategoryMap.get(key);
      if (subcatId) {
        for (let i = 0; i < types.length; i++) {
          await pool.query(`
            INSERT INTO product_types (subcategory_id, name, display_order)
            VALUES ($1, $2, $3)
            ON CONFLICT (subcategory_id, name) DO NOTHING
          `, [subcatId, types[i], i + 1]);
        }
      }
    }

    console.log('✅ Taxonomy data seeded successfully');
  } catch (error) {
    console.error('⚠️  Seeding taxonomy data failed:', error.message);
  }
}

async function seedDirect() {
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
      { sku: 'ELEC-TV-55-4K', name: '4K Smart TV 55-inch', price: 25999.00, stock: 25, brand: 'Electra', category: 'TV & Video', productType: 'Smart TVs' },
      { sku: 'ELEC-HEAD-NC', name: 'Noise-Cancelling Headphones', price: 7999.00, stock: 100, brand: 'SonicX', category: 'Audio', productType: 'Headphones' },
      { sku: 'ELEC-PHONE-128', name: 'Smartphone 128GB', price: 15999.00, stock: 50, brand: 'TechCore', category: 'Mobile', productType: 'Smartphones' },
      { sku: 'ELEC-LAPTOP-16', name: 'Gaming Laptop 16GB RAM', price: 45999.00, stock: 15, brand: 'GameMax', category: 'Computers', productType: 'Laptops' },
      { sku: 'ELEC-TABLET-10', name: '10-inch Tablet', price: 12999.00, stock: 75, brand: 'TabPro', category: 'Tablets', productType: 'Tablets' },
      { sku: 'ELEC-SPEAKER-BT', name: 'Bluetooth Speaker', price: 2999.00, stock: 200, brand: 'SoundWave', category: 'Audio', productType: 'Speakers' },
      { sku: 'ELEC-CAMERA-4K', name: '4K Action Camera', price: 8999.00, stock: 60, brand: 'ActionCam', category: 'Cameras', productType: 'Action Cameras' },
      { sku: 'ELEC-SMARTWATCH', name: 'Smart Watch Pro', price: 5999.00, stock: 120, brand: 'WearTech', category: 'Wearables', productType: 'Smartwatches' },
      { sku: 'ELEC-CHARGER-WIRELESS', name: 'Wireless Charger', price: 1999.00, stock: 300, brand: 'ChargeMax', category: 'Accessories', productType: 'Cases & Covers' },
      { sku: 'ELEC-ROUTER-WIFI6', name: 'WiFi 6 Router', price: 12999.00, stock: 40, brand: 'NetMax', category: 'Networking', productType: 'Routers' },
      { sku: 'ELEC-POWERBANK-20K', name: '20,000mAh Power Bank', price: 3499.00, stock: 180, brand: 'PowerMax', category: 'Accessories', productType: 'Chargers' },
      { sku: 'ELEC-EARBUDS-PRO', name: 'Wireless Earbuds Pro', price: 4999.00, stock: 150, brand: 'AudioTech', category: 'Audio', productType: 'Earbuds' },
      { sku: 'ELEC-PROJECTOR-FHD', name: 'Full HD Projector', price: 19999.00, stock: 20, brand: 'ViewMax', category: 'TV & Video', productType: 'Projectors' },
      { sku: 'ELEC-DRONE-4K', name: '4K Camera Drone', price: 29999.00, stock: 25, brand: 'SkyView', category: 'Cameras', productType: 'DSLR Cameras' },
      { sku: 'ELEC-MONITOR-27', name: '27-inch Gaming Monitor', price: 15999.00, stock: 35, brand: 'DisplayPro', category: 'Monitors', productType: 'Gaming Monitors' }
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

        const catResult = await pool.query('SELECT category_id FROM categories WHERE name = \'Electronics\'');
        const subcatResult = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult.rows[0].category_id]);
        const productTypeResult = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"color":"black","warranty":"1 year"}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - High quality ${product.category.toLowerCase()}`, product.brand, catResult.rows[0].category_id, subcatResult.rows[0]?.subcategory_id, productTypeResult.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Home & Garden - 12 products
    const homeGardenProducts = [
      { sku: 'HOME-FRIDGE-2D', name: 'Two-Door Refrigerator 14cuft', price: 18999.00, stock: 20, brand: 'CoolMax', category: 'Kitchen & Dining', productType: 'Small Appliances' },
      { sku: 'HOME-MICROWAVE-30L', name: 'Microwave Oven 30L', price: 5999.00, stock: 40, brand: 'HeatWave', category: 'Kitchen & Dining', productType: 'Small Appliances' },
      { sku: 'HOME-SOFA-3SEAT', name: '3-Seater Sofa', price: 15999.00, stock: 25, brand: 'ComfortMax', category: 'Furniture', productType: 'Sofas' },
      { sku: 'HOME-DINING-TABLE', name: '6-Seater Dining Table', price: 22999.00, stock: 30, brand: 'WoodCraft', category: 'Furniture', productType: 'Tables' },
      { sku: 'HOME-RICE-COOKER', name: 'Digital Rice Cooker 1.8L', price: 2999.00, stock: 80, brand: 'RicePro', category: 'Kitchen & Dining', productType: 'Cookware' },
      { sku: 'HOME-BLENDER-1000W', name: 'High-Power Blender 1000W', price: 3499.00, stock: 60, brand: 'BlendMaster', category: 'Kitchen & Dining', productType: 'Kitchen Tools' },
      { sku: 'HOME-BED-SHEETS', name: 'Cotton Bed Sheets Set', price: 1999.00, stock: 100, brand: 'SoftTouch', category: 'Bedding', productType: 'Bed Sheets' },
      { sku: 'HOME-FAN-STAND', name: 'Stand Fan 16-inch', price: 1499.00, stock: 150, brand: 'AirFlow', category: 'Lighting', productType: 'LED Lights' },
      { sku: 'HOME-VACUUM-CORDLESS', name: 'Cordless Vacuum Cleaner', price: 8999.00, stock: 45, brand: 'CleanSweep', category: 'Kitchen & Dining', productType: 'Small Appliances' },
      { sku: 'HOME-TOASTER-4SLICE', name: '4-Slice Toaster', price: 2499.00, stock: 70, brand: 'ToastMaster', category: 'Kitchen & Dining', productType: 'Small Appliances' },
      { sku: 'HOME-KETTLE-ELEC', name: 'Electric Kettle 1.7L', price: 1299.00, stock: 120, brand: 'BoilFast', category: 'Kitchen & Dining', productType: 'Small Appliances' },
      { sku: 'HOME-GARDEN-SPADE', name: 'Garden Spade Tool', price: 499.00, stock: 55, brand: 'GardenPro', category: 'Garden Tools', productType: 'Hand Tools' }
    ];

    for (const product of homeGardenProducts) {
      try {
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', ['electronics.owner@example.com']);
        if (userResult.rows.length === 0) continue;
        const userId = userResult.rows[0].user_id;

        const accountResult = await pool.query('SELECT account_id FROM accounts WHERE owner_user_id = $1', [userId]);
        if (accountResult.rows.length === 0) continue;
        const accountId = accountResult.rows[0].account_id;

        const existingProduct = await pool.query('SELECT product_id FROM products WHERE sku = $1', [product.sku]);
        if (existingProduct.rows.length > 0) continue;

        const catResult = await pool.query('SELECT category_id FROM categories WHERE name = \'Home & Garden\'');
        const subcatResult = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult.rows[0].category_id]);
        const productTypeResult = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"energy_rating":"A+","warranty":"2 years"}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Efficient ${product.category.toLowerCase()} appliance`, product.brand, catResult.rows[0].category_id, subcatResult.rows[0]?.subcategory_id, productTypeResult.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Electronics Peripherals - 12 products
    const peripheralsProducts = [
      { sku: 'PERI-KEYBOARD-MECH', name: 'Mechanical Keyboard RGB', price: 3999.00, stock: 80, brand: 'KeyMaster', category: 'Accessories', productType: 'Keyboards' },
      { sku: 'PERI-MOUSE-GAMING', name: 'Gaming Mouse RGB', price: 2499.00, stock: 150, brand: 'GameGear', category: 'Accessories', productType: 'Computer Accessories' },
      { sku: 'PERI-WEBCAM-4K', name: '4K Webcam Pro', price: 6999.00, stock: 90, brand: 'StreamCam', category: 'Accessories', productType: 'Computer Accessories' },
      { sku: 'PERI-HEADSET-USB', name: 'USB Gaming Headset', price: 4499.00, stock: 100, brand: 'AudioGame', category: 'Audio', productType: 'Microphones' },
      { sku: 'PERI-MONITOR-27', name: '27-inch Gaming Monitor 144Hz', price: 18999.00, stock: 30, brand: 'DisplayPro', category: 'Monitors', productType: 'Gaming Monitors' },
      { sku: 'PERI-MOUSEPAD-XXL', name: 'XXL Gaming Mouse Pad', price: 999.00, stock: 200, brand: 'DeskMat', category: 'Accessories', productType: 'Computer Accessories' },
      { sku: 'PERI-USB-HUB-7PORT', name: '7-Port USB Hub', price: 1499.00, stock: 120, brand: 'ConnectPlus', category: 'Accessories', productType: 'Computer Accessories' },
      { sku: 'PERI-CABLE-HDMI', name: 'HDMI Cable 2m 4K', price: 599.00, stock: 300, brand: 'CablePro', category: 'Accessories', productType: 'Audio Cables' },
      { sku: 'PERI-MIC-STREAMING', name: 'USB Streaming Microphone', price: 5999.00, stock: 60, brand: 'VoiceClear', category: 'Audio', productType: 'Microphones' },
      { sku: 'PERI-DOCK-LAPTOP', name: 'Laptop Docking Station', price: 7999.00, stock: 40, brand: 'DockMaster', category: 'Accessories', productType: 'Computer Accessories' },
      { sku: 'PERI-COOLER-LAPTOP', name: 'Laptop Cooling Pad RGB', price: 1999.00, stock: 110, brand: 'CoolLap', category: 'Accessories', productType: 'Computer Accessories' },
      { sku: 'PERI-ADAPTER-USBC', name: 'USB-C Multi Adapter', price: 1299.00, stock: 180, brand: 'AdaptAll', category: 'Accessories', productType: 'Computer Accessories' }
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

        const catResult2 = await pool.query('SELECT category_id FROM categories WHERE name = \'Electronics\'');
        const subcatResult2 = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult2.rows[0].category_id]);
        const productTypeResult2 = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult2.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"plug_and_play":true,"warranty":"1 year"}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Professional ${product.category.toLowerCase()}`, product.brand, catResult2.rows[0].category_id, subcatResult2.rows[0]?.subcategory_id, productTypeResult2.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Computer Components - 12 products
    const componentsProducts = [
      { sku: 'COMP-RAM-16GB', name: 'DDR4 RAM 16GB 3200MHz', price: 3999.00, stock: 80, brand: 'MemoryPro', category: 'Computers', productType: 'Computer Accessories' },
      { sku: 'COMP-SSD-1TB', name: 'NVMe SSD 1TB M.2', price: 5999.00, stock: 60, brand: 'SpeedDrive', category: 'Computers', productType: 'Computer Accessories' },
      { sku: 'COMP-GPU-RTX', name: 'Graphics Card RTX 6GB', price: 35999.00, stock: 15, brand: 'GraphicMax', category: 'Computers', productType: 'Computer Accessories' },
      { sku: 'COMP-CPU-I5', name: 'Intel i5 Processor 12th Gen', price: 12999.00, stock: 30, brand: 'IntelCore', category: 'Computers', productType: 'Computer Accessories' },
      { sku: 'COMP-MOBO-B550', name: 'B550 Motherboard ATX', price: 8999.00, stock: 25, brand: 'BoardMaster', category: 'Computers', productType: 'Computer Accessories' },
      { sku: 'COMP-PSU-750W', name: 'Power Supply 750W Modular', price: 6499.00, stock: 40, brand: 'PowerTech', category: 'Computers', productType: 'Computer Accessories' },
      { sku: 'COMP-CASE-ATX', name: 'ATX Gaming Case RGB', price: 4999.00, stock: 35, brand: 'CasePro', category: 'Computers', productType: 'Computer Accessories' },
      { sku: 'COMP-COOLER-CPU', name: 'CPU Cooler RGB Tower', price: 2999.00, stock: 50, brand: 'CoolCPU', category: 'Computers', productType: 'Computer Accessories' },
      { sku: 'COMP-HDD-2TB', name: 'Hard Drive 2TB 7200RPM', price: 3499.00, stock: 70, brand: 'DataStore', category: 'Computers', productType: 'Computer Accessories' },
      { sku: 'COMP-THERMAL-PASTE', name: 'Thermal Paste Premium', price: 499.00, stock: 150, brand: 'CoolPaste', category: 'Accessories', productType: 'Computer Accessories' },
      { sku: 'COMP-FAN-CASE-RGB', name: 'RGB Case Fan 120mm 3-Pack', price: 1999.00, stock: 90, brand: 'AirRGB', category: 'Computers', productType: 'Computer Accessories' },
      { sku: 'COMP-CABLE-SATA', name: 'SATA Cable 3-Pack', price: 399.00, stock: 200, brand: 'CableConnect', category: 'Accessories', productType: 'Audio Cables' }
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

        const catResult3 = await pool.query('SELECT category_id FROM categories WHERE name = \'Electronics\'');
        const subcatResult3 = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult3.rows[0].category_id]);
        const productTypeResult3 = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult3.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"compatible":"PC","warranty":"3 years"}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - High-performance ${product.category.toLowerCase()}`, product.brand, catResult3.rows[0].category_id, subcatResult3.rows[0]?.subcategory_id, productTypeResult3.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Gaming - 12 products
    const gamingProducts = [
      { sku: 'GAME-CONSOLE-PS5', name: 'Gaming Console PS5', price: 28999.00, stock: 20, brand: 'PlayStation', category: 'Video Games', productType: 'Gaming Consoles' },
      { sku: 'GAME-CONTROLLER-XBOX', name: 'Wireless Controller Xbox', price: 3499.00, stock: 80, brand: 'Xbox', category: 'Video Games', productType: 'Gaming Accessories' },
      { sku: 'GAME-CHAIR-RACING', name: 'Gaming Chair Racing Style', price: 12999.00, stock: 25, brand: 'SeatComfort', category: 'Furniture', productType: 'Chairs' },
      { sku: 'GAME-DESK-RGB', name: 'Gaming Desk with RGB', price: 15999.00, stock: 15, brand: 'DeskGamer', category: 'Furniture', productType: 'Tables' },
      { sku: 'GAME-HEADSET-7.1', name: '7.1 Surround Gaming Headset', price: 5999.00, stock: 60, brand: 'SoundGame', category: 'Audio', productType: 'Gaming Headsets' },
      { sku: 'GAME-KEYBOARD-TKL', name: 'TKL Mechanical Gaming Keyboard', price: 4499.00, stock: 50, brand: 'GameKeys', category: 'Accessories', productType: 'Keyboards' },
      { sku: 'GAME-MOUSE-ULTRA', name: 'Ultra-Light Gaming Mouse', price: 2999.00, stock: 90, brand: 'MousePro', category: 'Accessories', productType: 'Computer Accessories' },
      { sku: 'GAME-CAPTURE-CARD', name: 'Game Capture Card 4K60', price: 9999.00, stock: 30, brand: 'StreamCapture', category: 'Accessories', productType: 'Computer Accessories' },
      { sku: 'GAME-STEERING-WHEEL', name: 'Racing Wheel with Pedals', price: 18999.00, stock: 20, brand: 'RaceSim', category: 'Video Games', productType: 'Gaming Accessories' },
      { sku: 'GAME-VR-HEADSET', name: 'VR Gaming Headset', price: 24999.00, stock: 18, brand: 'VirtualReality', category: 'Wearables', productType: 'VR Headsets' },
      { sku: 'GAME-LED-STRIP', name: 'LED Strip Lights RGB 5m', price: 1299.00, stock: 150, brand: 'LightSetup', category: 'Accessories', productType: 'Computer Accessories' },
      { sku: 'GAME-CONTROLLER-FIGHT', name: 'Fight Stick Arcade Controller', price: 7999.00, stock: 35, brand: 'FightPro', category: 'Video Games', productType: 'Gaming Accessories' }
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

        // Determine category based on product category
        let categoryName;
        if (['Video Games', 'Audio', 'Accessories', 'Wearables'].includes(product.category)) {
          categoryName = 'Electronics';
        } else if (['Furniture'].includes(product.category)) {
          categoryName = 'Home & Garden';
        } else {
          categoryName = 'Electronics'; // default
        }

        const catResult4 = await pool.query('SELECT category_id FROM categories WHERE name = $1', [categoryName]);
        const subcatResult4 = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult4.rows[0].category_id]);
        const productTypeResult4 = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult4.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"gaming_grade":"pro","warranty":"1 year"}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Pro-level ${product.category.toLowerCase()}`, product.brand, catResult4.rows[0].category_id, subcatResult4.rows[0]?.subcategory_id, productTypeResult4.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // ==================== COSMA BEAUTY SHOP PRODUCTS ====================
    // Cosmetics - 15 products
    const cosmeticsProducts = [
      { sku: 'COS-LIP-MATTE', name: 'Matte Lipstick', price: 499.00, stock: 300, brand: 'Chroma', category: 'Makeup', productType: 'Lipstick' },
      { sku: 'COS-FOUNDATION-30', name: 'Full Coverage Foundation', price: 899.00, stock: 150, brand: 'BeautyBase', category: 'Makeup', productType: 'Foundation' },
      { sku: 'COS-MASCARA-VOL', name: 'Volumizing Mascara', price: 599.00, stock: 250, brand: 'LashPro', category: 'Makeup', productType: 'Mascara' },
      { sku: 'COS-EYESHADOW-PAL', name: 'Eyeshadow Palette', price: 1299.00, stock: 100, brand: 'ColorPop', category: 'Makeup', productType: 'Eyeshadow' },
      { sku: 'COS-CONCEALER-FULL', name: 'Full Coverage Concealer', price: 649.00, stock: 175, brand: 'HideIt', category: 'Makeup', productType: 'Foundation' },
      { sku: 'COS-LIPGLOSS-SHINE', name: 'Shiny Lip Gloss', price: 399.00, stock: 220, brand: 'Glossy', category: 'Makeup', productType: 'Lipstick' },
      { sku: 'COS-BLUSH-PINK', name: 'Pink Blush Compact', price: 749.00, stock: 140, brand: 'Cheeky', category: 'Makeup', productType: 'Blush' },
      { sku: 'COS-EYELINER-WING', name: 'Winged Eyeliner Pen', price: 449.00, stock: 190, brand: 'WingMaster', category: 'Makeup', productType: 'Eyeshadow' },
      { sku: 'COS-POWDER-SET', name: 'Setting Powder Translucent', price: 799.00, stock: 130, brand: 'SetPro', category: 'Makeup', productType: 'Foundation' },
      { sku: 'COS-PRIMER-FACE', name: 'Face Primer Smoothing', price: 899.00, stock: 110, brand: 'PrimePerfect', category: 'Makeup', productType: 'Foundation' },
      { sku: 'COS-BRONZER-CONT', name: 'Bronzer Contour Palette', price: 1099.00, stock: 90, brand: 'Sculpt', category: 'Makeup', productType: 'Blush' },
      { sku: 'COS-BROW-KIT', name: 'Eyebrow Kit with Brush', price: 699.00, stock: 160, brand: 'BrowPro', category: 'Makeup', productType: 'Eyeshadow' },
      { sku: 'COS-LIPLINER-SET', name: 'Lip Liner Set 5 Colors', price: 899.00, stock: 120, brand: 'LineMaster', category: 'Makeup', productType: 'Lipstick' },
      { sku: 'COS-HIGHLIGHT-GLOW', name: 'Highlighter Glow Palette', price: 999.00, stock: 100, brand: 'ShineOn', category: 'Makeup', productType: 'Blush' },
      { sku: 'COS-MAKEUP-REMOVER', name: 'Makeup Remover Wipes 50pc', price: 349.00, stock: 250, brand: 'CleanOff', category: 'Makeup', productType: 'Foundation' }
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

        const catResult5 = await pool.query('SELECT category_id FROM categories WHERE name = \'Beauty & Cosmetics\'');
        const subcatResult5 = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult5.rows[0].category_id]);
        const productTypeResult5 = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult5.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"skin_type":"all","cruelty_free":true}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Premium ${product.category.toLowerCase()}`, product.brand, catResult5.rows[0].category_id, subcatResult5.rows[0]?.subcategory_id, productTypeResult5.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Skincare - 12 products
    const skincareProducts = [
      { sku: 'SKIN-SERUM-30', name: 'Hydrating Serum 30ml', price: 1299.00, stock: 200, brand: 'GlowUp', category: 'Skincare', productType: 'Serums' },
      { sku: 'SKIN-CLEANSER-GEL', name: 'Gentle Gel Cleanser', price: 699.00, stock: 180, brand: 'PureSkin', category: 'Skincare', productType: 'Face Wash' },
      { sku: 'SKIN-MOISTURIZER-50', name: 'Anti-Aging Moisturizer', price: 1499.00, stock: 120, brand: 'AgeDefy', category: 'Skincare', productType: 'Moisturizers' },
      { sku: 'SKIN-SUNSCREEN-SPF50', name: 'SPF 50 Sunscreen', price: 799.00, stock: 200, brand: 'SunGuard', category: 'Skincare', productType: 'Sun Protection' },
      { sku: 'SKIN-TONER-200', name: 'Hydrating Toner', price: 549.00, stock: 160, brand: 'Refresh', category: 'Skincare', productType: 'Serums' },
      { sku: 'SKIN-FACEMASK-5PACK', name: 'Hydrating Face Mask 5-pack', price: 999.00, stock: 80, brand: 'MaskCare', category: 'Skincare', productType: 'Masks' },
      { sku: 'SKIN-EXFOLIATOR-SCRUB', name: 'Gentle Exfoliating Scrub', price: 899.00, stock: 110, brand: 'SmoothSkin', category: 'Skincare', productType: 'Face Wash' },
      { sku: 'SKIN-EYECREAM-15ML', name: 'Anti-Aging Eye Cream', price: 1199.00, stock: 90, brand: 'EyeCare', category: 'Skincare', productType: 'Moisturizers' },
      { sku: 'SKIN-ESSENCE-100ML', name: 'Brightening Essence', price: 1399.00, stock: 100, brand: 'Bright', category: 'Skincare', productType: 'Serums' },
      { sku: 'SKIN-MICELLAR-400ML', name: 'Micellar Water 400ml', price: 599.00, stock: 150, brand: 'ClearWater', category: 'Skincare', productType: 'Face Wash' },
      { sku: 'SKIN-VITAMIN-C', name: 'Vitamin C Serum 30ml', price: 1599.00, stock: 80, brand: 'VitaGlow', category: 'Skincare', productType: 'Serums' },
      { sku: 'SKIN-RETINOL-NIGHT', name: 'Retinol Night Cream', price: 1799.00, stock: 70, brand: 'RetinolPro', category: 'Skincare', productType: 'Moisturizers' }
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

        const catResult6 = await pool.query('SELECT category_id FROM categories WHERE name = \'Beauty & Cosmetics\'');
        const subcatResult6 = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult6.rows[0].category_id]);
        const productTypeResult6 = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult6.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"dermatologist_tested":true,"hypoallergenic":true}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Advanced ${product.category.toLowerCase()}`, product.brand, catResult6.rows[0].category_id, subcatResult6.rows[0]?.subcategory_id, productTypeResult6.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Fashion - 12 products
    const fashionProducts = [
      { sku: 'FASH-TSHIRT-M', name: 'Cotton T-Shirt Medium', price: 299.00, stock: 500, brand: 'StyleHub', category: 'Men\'s Clothing', productType: 'T-Shirts' },
      { sku: 'FASH-JEANS-32', name: 'Denim Jeans Size 32', price: 1299.00, stock: 200, brand: 'DenimCo', category: 'Men\'s Clothing', productType: 'Jeans' },
      { sku: 'FASH-DRESS-S', name: 'Summer Dress Small', price: 899.00, stock: 150, brand: 'ChicWear', category: 'Women\'s Clothing', productType: 'Dresses' },
      { sku: 'FASH-SNEAKERS-9', name: 'Running Sneakers Size 9', price: 2499.00, stock: 120, brand: 'SportyFeet', category: 'Shoes', productType: 'Sports Shoes' },
      { sku: 'FASH-HANDBAG', name: 'Leather Handbag', price: 1899.00, stock: 80, brand: 'LuxBags', category: 'Accessories', productType: 'Bags' },
      { sku: 'FASH-SUNGLASSES', name: 'Polarized Sunglasses', price: 699.00, stock: 250, brand: 'SunStyle', category: 'Accessories', productType: 'Bags' },
      { sku: 'FASH-WATCH-M', name: 'Analog Wrist Watch', price: 3499.00, stock: 60, brand: 'TimeKeep', category: 'Accessories', productType: 'Watches' },
      { sku: 'FASH-BELT-L', name: 'Leather Belt Large', price: 499.00, stock: 300, brand: 'BeltCraft', category: 'Accessories', productType: 'Belts' },
      { sku: 'FASH-HAT-CAP', name: 'Baseball Cap', price: 349.00, stock: 400, brand: 'CapMaster', category: 'Accessories', productType: 'Bags' },
      { sku: 'FASH-JACKET-XL', name: 'Windbreaker Jacket XL', price: 1999.00, stock: 90, brand: 'OutdoorWear', category: 'Men\'s Clothing', productType: 'Jackets' },
      { sku: 'FASH-SCARF', name: 'Wool Scarf', price: 599.00, stock: 180, brand: 'WarmKnit', category: 'Accessories', productType: 'Bags' },
      { sku: 'FASH-SOCKS-3PACK', name: 'Cotton Socks 3-Pack', price: 199.00, stock: 600, brand: 'ComfyFeet', category: 'Men\'s Clothing', productType: 'T-Shirts' }
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

        const catResult7 = await pool.query('SELECT category_id FROM categories WHERE name = \'Fashion & Clothing\'');
        const subcatResult7 = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult7.rows[0].category_id]);
        const productTypeResult7 = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult7.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"material":"quality","size_range":"various"}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Trendy ${product.category.toLowerCase()}`, product.brand, catResult7.rows[0].category_id, subcatResult7.rows[0]?.subcategory_id, productTypeResult7.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Home & Living - 12 products
    const homeProducts = [
      { sku: 'HOME-PILLOW-2', name: 'Memory Foam Pillow 2-Pack', price: 999.00, stock: 100, brand: 'ComfortHome', category: 'Bedding', productType: 'Pillows' },
      { sku: 'HOME-BLANKET-Q', name: 'Queen Size Blanket', price: 1499.00, stock: 80, brand: 'WarmLiving', category: 'Bedding', productType: 'Bed Sheets' },
      { sku: 'HOME-LAMP-LED', name: 'LED Desk Lamp', price: 799.00, stock: 150, brand: 'BrightSpace', category: 'Lighting', productType: 'LED Lights' },
      { sku: 'HOME-CURTAIN-SET', name: 'Blackout Curtains Set', price: 1299.00, stock: 70, brand: 'WindowStyle', category: 'Decor', productType: 'Wall Decor' },
      { sku: 'HOME-VASE-CERAMIC', name: 'Ceramic Flower Vase', price: 599.00, stock: 120, brand: 'ArtDecor', category: 'Decor', productType: 'Wall Decor' },
      { sku: 'HOME-RUG-6X9', name: 'Area Rug 6x9 feet', price: 2999.00, stock: 50, brand: 'FloorCraft', category: 'Decor', productType: 'Wall Decor' },
      { sku: 'HOME-TOWEL-6PACK', name: 'Bath Towel 6-Pack', price: 899.00, stock: 200, brand: 'SoftTouch', category: 'Bath', productType: 'Towels' },
      { sku: 'HOME-ORGANIZER', name: 'Storage Organizer', price: 699.00, stock: 180, brand: 'TidySpace', category: 'Furniture', productType: 'Storage' },
      { sku: 'HOME-MIRROR-WALL', name: 'Wall Mirror Large', price: 1899.00, stock: 60, brand: 'ReflectStyle', category: 'Decor', productType: 'Wall Decor' },
      { sku: 'HOME-CLOCK-WALL', name: 'Modern Wall Clock', price: 499.00, stock: 220, brand: 'TimeDecor', category: 'Decor', productType: 'Wall Decor' },
      { sku: 'HOME-CANDLE-SET', name: 'Scented Candle Set', price: 799.00, stock: 140, brand: 'AromaBliss', category: 'Decor', productType: 'Wall Decor' },
      { sku: 'HOME-PLANT-POT', name: 'Ceramic Plant Pot', price: 399.00, stock: 300, brand: 'GreenSpace', category: 'Plants & Seeds', productType: 'Plant Pots' }
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

        const catResult8 = await pool.query('SELECT category_id FROM categories WHERE name = \'Home & Garden\'');
        const subcatResult8 = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult8.rows[0].category_id]);
        const productTypeResult8 = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult8.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"eco_friendly":true,"durable":true}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Quality ${product.category.toLowerCase()}`, product.brand, catResult8.rows[0].category_id, subcatResult8.rows[0]?.subcategory_id, productTypeResult8.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Hair Care - 12 products
    const haircareProducts = [
      { sku: 'HAIR-SHAMPOO-HYDRA', name: 'Hydrating Shampoo 500ml', price: 699.00, stock: 150, brand: 'LuxHair', category: 'Hair Care', productType: 'Shampoos' },
      { sku: 'HAIR-CONDITIONER-SMOOTH', name: 'Smoothing Conditioner 500ml', price: 699.00, stock: 140, brand: 'LuxHair', category: 'Hair Care', productType: 'Conditioners' },
      { sku: 'HAIR-OIL-ARGAN', name: 'Argan Hair Oil 100ml', price: 999.00, stock: 100, brand: 'OilPure', category: 'Hair Care', productType: 'Hair Oils' },
      { sku: 'HAIR-MASK-REPAIR', name: 'Repairing Hair Mask 300ml', price: 899.00, stock: 80, brand: 'RepairPro', category: 'Hair Care', productType: 'Hair Masks' },
      { sku: 'HAIR-SERUM-SHINE', name: 'Shine Serum 50ml', price: 799.00, stock: 120, brand: 'GlossyHair', category: 'Hair Care', productType: 'Hair Serums' },
      { sku: 'HAIR-SPRAY-HOLD', name: 'Strong Hold Hair Spray', price: 599.00, stock: 180, brand: 'StyleFix', category: 'Hair Care', productType: 'Hair Sprays' },
      { sku: 'HAIR-GEL-STYLING', name: 'Styling Gel 200ml', price: 499.00, stock: 200, brand: 'HoldFast', category: 'Hair Care', productType: 'Hair Gels' },
      { sku: 'HAIR-FOAM-VOLUME', name: 'Volumizing Foam 150ml', price: 699.00, stock: 110, brand: 'VolumePro', category: 'Hair Care', productType: 'Hair Foams' },
      { sku: 'HAIR-TREATMENT-KERATIN', name: 'Keratin Treatment 250ml', price: 1499.00, stock: 60, brand: 'KeratinCare', category: 'Hair Care', productType: 'Hair Treatments' },
      { sku: 'HAIR-DRYER-IONIC', name: 'Ionic Hair Dryer 2000W', price: 2999.00, stock: 50, brand: 'DryCare', category: 'Tools & Brushes', productType: 'Hair Dryers' },
      { sku: 'HAIR-BRUSH-DETANGLE', name: 'Detangling Brush', price: 399.00, stock: 250, brand: 'BrushEase', category: 'Tools & Brushes', productType: 'Hair Brushes' },
      { sku: 'HAIR-STRAIGHTENER-PRO', name: 'Pro Hair Straightener', price: 3499.00, stock: 40, brand: 'StraightLine', category: 'Tools & Brushes', productType: 'Hair Straighteners' }
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

        const catResult9 = await pool.query('SELECT category_id FROM categories WHERE name = \'Beauty & Cosmetics\'');
        const subcatResult9 = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult9.rows[0].category_id]);
        const productTypeResult9 = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult9.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"sulfate_free":true,"paraben_free":true}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Professional ${product.category.toLowerCase()}`, product.brand, catResult9.rows[0].category_id, subcatResult9.rows[0]?.subcategory_id, productTypeResult9.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Fragrances - 12 products
    const fragranceProducts = [
      { sku: 'FRAG-PERFUME-FLORAL', name: 'Floral Eau de Parfum 50ml', price: 2999.00, stock: 60, brand: 'ScentLux', category: 'Fragrance', productType: 'Eau de Parfum' },
      { sku: 'FRAG-COLOGNE-FRESH', name: 'Fresh Cologne 100ml', price: 2499.00, stock: 70, brand: 'FreshScent', category: 'Fragrance', productType: 'Eau de Cologne' },
      { sku: 'FRAG-BODYSPRAY-CITRUS', name: 'Citrus Body Spray 200ml', price: 599.00, stock: 200, brand: 'SprayFresh', category: 'Fragrance', productType: 'Body Sprays' },
      { sku: 'FRAG-PERFUME-WOODY', name: 'Woody Eau de Toilette 75ml', price: 2799.00, stock: 50, brand: 'WoodNotes', category: 'Fragrance', productType: 'Eau de Toilette' },
      { sku: 'FRAG-DIFFUSER-LAVENDER', name: 'Lavender Reed Diffuser', price: 999.00, stock: 120, brand: 'AromaHome', category: 'Fragrance', productType: 'Room Diffusers' },
      { sku: 'FRAG-CANDLE-VANILLA', name: 'Vanilla Scented Candle', price: 799.00, stock: 150, brand: 'CandleGlow', category: 'Fragrance', productType: 'Scented Candles' },
      { sku: 'FRAG-MIST-ROSE', name: 'Rose Body Mist 250ml', price: 699.00, stock: 180, brand: 'MistCare', category: 'Fragrance', productType: 'Body Mists' },
      { sku: 'FRAG-OIL-ESSENTIAL', name: 'Essential Oil Set 10pc', price: 1299.00, stock: 90, brand: 'PureEssence', category: 'Fragrance', productType: 'Essential Oils' },
      { sku: 'FRAG-SPRAY-AIR', name: 'Air Freshener Spray', price: 399.00, stock: 250, brand: 'FreshAir', category: 'Fragrance', productType: 'Air Fresheners' },
      { sku: 'FRAG-LOTION-SCENTED', name: 'Scented Body Lotion 200ml', price: 899.00, stock: 140, brand: 'SoftSmell', category: 'Fragrance', productType: 'Body Lotions' },
      { sku: 'FRAG-SACHET-CLOSET', name: 'Closet Sachet 5-Pack', price: 499.00, stock: 200, brand: 'FreshSpace', category: 'Fragrance', productType: 'Room Diffusers' },
      { sku: 'FRAG-ROLLER-TRAVEL', name: 'Travel Perfume Roller 10ml', price: 799.00, stock: 110, brand: 'TravelScent', category: 'Fragrance', productType: 'Eau de Parfum' }
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

        const catResult10 = await pool.query('SELECT category_id FROM categories WHERE name = \'Beauty & Cosmetics\'');
        const subcatResult10 = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult10.rows[0].category_id]);
        const productTypeResult10 = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult10.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"long_lasting":true,"allergen_free":false}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Luxurious ${product.category.toLowerCase()}`, product.brand, catResult10.rows[0].category_id, subcatResult10.rows[0]?.subcategory_id, productTypeResult10.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // ==================== GUSTO BITES SHOP PRODUCTS ====================
    // Food - 8 products
    const foodProducts = [
      { sku: 'FOOD-GRANOLA-500G', name: 'Organic Granola 500g', price: 449.00, stock: 200, brand: 'NatureCrunch', category: 'Breakfast', productType: 'Cereals' },
      { sku: 'FOOD-CHOCOLATE-DARK', name: 'Dark Chocolate 70%', price: 349.00, stock: 300, brand: 'CocoaPure', category: 'Confectionery', productType: 'Chocolates' },
      { sku: 'FOOD-HONEY-RAW', name: 'Raw Honey 500g', price: 699.00, stock: 80, brand: 'BeePure', category: 'Sweeteners', productType: 'Honey' },
      { sku: 'FOOD-DRIED-FRUIT', name: 'Mixed Dried Fruit 300g', price: 399.00, stock: 160, brand: 'FruitMix', category: 'Snacks', productType: 'Dried Fruits' },
      { sku: 'FOOD-CEREAL-HEALTHY', name: 'Healthy Cereal 500g', price: 549.00, stock: 120, brand: 'GrainGood', category: 'Breakfast', productType: 'Cereals' },
      { sku: 'FOOD-PASTA-WHOLE', name: 'Whole Wheat Pasta 500g', price: 299.00, stock: 180, brand: 'PastaPro', category: 'Snacks', productType: 'Nuts & Seeds' },
      { sku: 'FOOD-RICE-ORGANIC', name: 'Organic Brown Rice 2kg', price: 599.00, stock: 100, brand: 'GrainPure', category: 'Snacks', productType: 'Nuts & Seeds' },
      { sku: 'FOOD-OATS-ROLLED', name: 'Rolled Oats 1kg', price: 399.00, stock: 150, brand: 'OatGood', category: 'Breakfast', productType: 'Cereals' }
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

        const catResult11 = await pool.query('SELECT category_id FROM categories WHERE name = \'Food & Beverages\'');
        const subcatResult11 = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult11.rows[0].category_id]);
        const productTypeResult11 = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult11.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"organic":true,"gluten_free":false}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Premium ${product.category.toLowerCase()}`, product.brand, catResult11.rows[0].category_id, subcatResult11.rows[0]?.subcategory_id, productTypeResult11.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Drinks - 7 products
    const drinksProducts = [
      { sku: 'DRINK-CBREW-1L', name: 'Cold Brew Coffee 1L', price: 299.00, stock: 150, brand: 'BrewLab', category: 'Beverages', productType: 'Coffee' },
      { sku: 'DRINK-TEA-GREEN', name: 'Green Tea Bags (50-pack)', price: 249.00, stock: 250, brand: 'TeaLeaf', category: 'Beverages', productType: 'Tea' },
      { sku: 'DRINK-JUICE-ORGANIC', name: 'Organic Apple Juice 1L', price: 199.00, stock: 200, brand: 'FruitFresh', category: 'Beverages', productType: 'Juice' },
      { sku: 'DRINK-ENERGY-NATURAL', name: 'Natural Energy Drink', price: 149.00, stock: 300, brand: 'EnergyBoost', category: 'Beverages', productType: 'Energy Drinks' },
      { sku: 'DRINK-SMOOTHIE-MIX', name: 'Superfood Smoothie Mix', price: 599.00, stock: 100, brand: 'GreenBoost', category: 'Beverages', productType: 'Juice' },
      { sku: 'DRINK-WATER-SPARKLING', name: 'Sparkling Water 6-Pack', price: 299.00, stock: 180, brand: 'BubbleWater', category: 'Beverages', productType: 'Water' },
      { sku: 'DRINK-MILK-ALMOND', name: 'Almond Milk 1L', price: 249.00, stock: 140, brand: 'NutMilk', category: 'Beverages', productType: 'Water' }
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

        const catResult12 = await pool.query('SELECT category_id FROM categories WHERE name = \'Food & Beverages\'');
        const subcatResult12 = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult12.rows[0].category_id]);
        const productTypeResult12 = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult12.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"sugar_free":false,"natural":true}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Refreshing ${product.category.toLowerCase()}`, product.brand, catResult12.rows[0].category_id, subcatResult12.rows[0]?.subcategory_id, productTypeResult12.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Snacks - 12 products
    const snacksProducts = [
      { sku: 'SNACK-CHIPS-BBQ', name: 'BBQ Potato Chips 200g', price: 149.00, stock: 400, brand: 'CrunchyBite', category: 'Snacks', productType: 'Chips' },
      { sku: 'SNACK-POPCORN-BUTTER', name: 'Butter Popcorn 150g', price: 129.00, stock: 350, brand: 'PopCrunch', category: 'Snacks', productType: 'Popcorn' },
      { sku: 'SNACK-COOKIES-CHOCO', name: 'Chocolate Chip Cookies 250g', price: 199.00, stock: 300, brand: 'BakeJoy', category: 'Snacks', productType: 'Cookies' },
      { sku: 'SNACK-PRETZELS-SALT', name: 'Salted Pretzels 200g', price: 169.00, stock: 280, brand: 'TwistSnack', category: 'Snacks', productType: 'Pretzels' },
      { sku: 'SNACK-TRAIL-MIX', name: 'Trail Mix Deluxe 300g', price: 349.00, stock: 200, brand: 'NuttyTrail', category: 'Snacks', productType: 'Mixed Snacks' },
      { sku: 'SNACK-CRACKERS-CHEESE', name: 'Cheese Crackers 180g', price: 159.00, stock: 320, brand: 'CrunchCheese', category: 'Snacks', productType: 'Crackers' },
      { sku: 'SNACK-JERKY-BEEF', name: 'Beef Jerky 100g', price: 299.00, stock: 150, brand: 'MeatSnack', category: 'Snacks', productType: 'Protein Snacks' },
      { sku: 'SNACK-GRANOLA-BAR', name: 'Granola Bars 6-Pack', price: 249.00, stock: 250, brand: 'HealthyBite', category: 'Snacks', productType: 'Bars' },
      { sku: 'SNACK-CANDY-GUMMY', name: 'Gummy Bears 250g', price: 179.00, stock: 380, brand: 'SweetGummy', category: 'Snacks', productType: 'Candy' },
      { sku: 'SNACK-WAFER-HAZELNUT', name: 'Hazelnut Wafer 150g', price: 149.00, stock: 290, brand: 'WaferCrisp', category: 'Snacks', productType: 'Wafers' },
      { sku: 'SNACK-NUTS-CASHEW', name: 'Roasted Cashews 200g', price: 399.00, stock: 160, brand: 'NuttyPremium', category: 'Snacks', productType: 'Nuts' },
      { sku: 'SNACK-RICE-CAKE', name: 'Rice Cakes 10-Pack', price: 99.00, stock: 420, brand: 'LightBite', category: 'Snacks', productType: 'Rice Snacks' }
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

        const catResult13 = await pool.query('SELECT category_id FROM categories WHERE name = \'Food & Beverages\'');
        const subcatResult13 = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult13.rows[0].category_id]);
        const productTypeResult13 = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult13.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"preservative_free":false,"tasty":true}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Delicious ${product.category.toLowerCase()}`, product.brand, catResult13.rows[0].category_id, subcatResult13.rows[0]?.subcategory_id, productTypeResult13.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Condiments & Sauces - 12 products
    const condimentsProducts = [
      { sku: 'COND-KETCHUP-500ML', name: 'Tomato Ketchup 500ml', price: 149.00, stock: 280, brand: 'TomatoKing', category: 'Seasonings', productType: 'Sauces' },
      { sku: 'COND-SOY-SAUCE', name: 'Premium Soy Sauce 250ml', price: 199.00, stock: 250, brand: 'SoyMaster', category: 'Seasonings', productType: 'Sauces' },
      { sku: 'COND-MAYO-400ML', name: 'Mayonnaise 400ml', price: 179.00, stock: 300, brand: 'CreamySpread', category: 'Seasonings', productType: 'Sauces' },
      { sku: 'COND-HOT-SAUCE', name: 'Hot Chili Sauce 150ml', price: 129.00, stock: 220, brand: 'SpicyKick', category: 'Seasonings', productType: 'Sauces' },
      { sku: 'COND-MUSTARD-HONEY', name: 'Honey Mustard 250ml', price: 169.00, stock: 200, brand: 'HoneyTang', category: 'Seasonings', productType: 'Sauces' },
      { sku: 'COND-VINEGAR-APPLE', name: 'Apple Cider Vinegar 500ml', price: 249.00, stock: 180, brand: 'AppleZest', category: 'Seasonings', productType: 'Sauces' },
      { sku: 'COND-BBQ-SAUCE', name: 'BBQ Sauce Smokey 350ml', price: 199.00, stock: 190, brand: 'SmokeHouse', category: 'Seasonings', productType: 'Sauces' },
      { sku: 'COND-WORCESTER', name: 'Worcestershire Sauce 200ml', price: 179.00, stock: 160, brand: 'TangySauce', category: 'Seasonings', productType: 'Sauces' },
      { sku: 'COND-PEANUT-BUTTER', name: 'Creamy Peanut Butter 350g', price: 299.00, stock: 220, brand: 'NutSpread', category: 'Seasonings', productType: 'Sauces' },
      { sku: 'COND-JAM-STRAWBERRY', name: 'Strawberry Jam 300g', price: 229.00, stock: 250, brand: 'FruitSweet', category: 'Seasonings', productType: 'Sauces' },
      { sku: 'COND-OLIVE-OIL', name: 'Extra Virgin Olive Oil 500ml', price: 599.00, stock: 140, brand: 'OlivePure', category: 'Seasonings', productType: 'Sauces' },
      { sku: 'COND-SALSA-MILD', name: 'Mild Salsa Dip 300g', price: 189.00, stock: 200, brand: 'MexiDip', category: 'Seasonings', productType: 'Sauces' }
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

        const catResult14 = await pool.query('SELECT category_id FROM categories WHERE name = \'Food & Beverages\'');
        const subcatResult14 = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult14.rows[0].category_id]);
        const productTypeResult14 = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult14.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"preservatives":"minimal","gluten_free":false}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Flavorful ${product.category.toLowerCase()}`, product.brand, catResult14.rows[0].category_id, subcatResult14.rows[0]?.subcategory_id, productTypeResult14.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
      } catch (error) {
        console.error(`Error inserting product ${product.sku}:`, error.message);
      }
    }

    // Baking Supplies - 12 products
    const bakingProducts = [
      { sku: 'BAKE-FLOUR-ALL', name: 'All-Purpose Flour 1kg', price: 149.00, stock: 300, brand: 'BakeMaster', category: 'Seasonings', productType: 'Flour' },
      { sku: 'BAKE-SUGAR-WHITE', name: 'White Sugar 1kg', price: 129.00, stock: 350, brand: 'SweetBake', category: 'Seasonings', productType: 'Sugar' },
      { sku: 'BAKE-YEAST-INSTANT', name: 'Instant Yeast 100g', price: 99.00, stock: 200, brand: 'RisePro', category: 'Seasonings', productType: 'Yeast' },
      { sku: 'BAKE-POWDER-BAKING', name: 'Baking Powder 200g', price: 89.00, stock: 250, brand: 'LiftAgent', category: 'Seasonings', productType: 'Baking Powder' },
      { sku: 'BAKE-SODA-BAKING', name: 'Baking Soda 250g', price: 79.00, stock: 280, brand: 'SodaBake', category: 'Seasonings', productType: 'Baking Soda' },
      { sku: 'BAKE-VANILLA-EXTRACT', name: 'Vanilla Extract 100ml', price: 349.00, stock: 150, brand: 'VanillaPure', category: 'Seasonings', productType: 'Extracts' },
      { sku: 'BAKE-CHOCO-CHIPS', name: 'Chocolate Chips 250g', price: 249.00, stock: 220, brand: 'ChocoDelight', category: 'Seasonings', productType: 'Chocolate Chips' },
      { sku: 'BAKE-COCOA-POWDER', name: 'Cocoa Powder 200g', price: 299.00, stock: 180, brand: 'CocoaBake', category: 'Seasonings', productType: 'Cocoa Powder' },
      { sku: 'BAKE-CORN-STARCH', name: 'Corn Starch 400g', price: 119.00, stock: 240, brand: 'ThickenIt', category: 'Seasonings', productType: 'Corn Starch' },
      { sku: 'BAKE-BROWN-SUGAR', name: 'Brown Sugar 500g', price: 159.00, stock: 200, brand: 'CaramelSweet', category: 'Seasonings', productType: 'Sugar' },
      { sku: 'BAKE-BUTTER-UNSALTED', name: 'Unsalted Butter 250g', price: 299.00, stock: 160, brand: 'CreamyBake', category: 'Seasonings', productType: 'Butter' },
      { sku: 'BAKE-EGGS-POWDER', name: 'Egg Powder 200g', price: 349.00, stock: 120, brand: 'EggBake', category: 'Seasonings', productType: 'Egg Products' }
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

        const catResult15 = await pool.query('SELECT category_id FROM categories WHERE name = \'Food & Beverages\'');
        const subcatResult15 = await pool.query('SELECT subcategory_id FROM subcategories WHERE name = $1 AND category_id = $2', [product.category, catResult15.rows[0].category_id]);
        const productTypeResult15 = await pool.query('SELECT product_type_id FROM product_types WHERE name = $1 AND subcategory_id = $2', [product.productType, subcatResult15.rows[0]?.subcategory_id]);
        await pool.query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category_id, subcategory_id, product_type_id, price, stock, attributes, images)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{"quality":"premium","baker_approved":true}', $12::jsonb)
        `, [userId, accountId, product.name, product.sku, `${product.name} - Essential ${product.category.toLowerCase()}`, product.brand, catResult15.rows[0].category_id, subcatResult15.rows[0]?.subcategory_id, productTypeResult15.rows[0]?.product_type_id, product.price.toString(), product.stock.toString(), `["https://example.com/${product.sku.toLowerCase()}.jpg"]`]);
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
    
    // Seed taxonomy data
    await seedTaxonomyData(pool);
    
    console.log('✅ Seeded roles, permissions, users, products, and taxonomy via direct connection');
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
      { sku: 'ELEC-TV-55-4K', name: '4K Smart TV 55-inch', price: 25999.00, stock: 25, brand: 'Electra', category: 'TV & Video', productType: 'Smart TVs' },
      { sku: 'ELEC-HEAD-NC', name: 'Noise-Cancelling Headphones', price: 7999.00, stock: 100, brand: 'SonicX', category: 'Audio', productType: 'Headphones' },
      { sku: 'ELEC-PHONE-128', name: 'Smartphone 128GB', price: 15999.00, stock: 50, brand: 'TechCore', category: 'Mobile', productType: 'Smartphones' },
      { sku: 'ELEC-LAPTOP-16', name: 'Gaming Laptop 16GB RAM', price: 45999.00, stock: 15, brand: 'GameMax', category: 'Computers', productType: 'Laptops' },
      { sku: 'ELEC-TABLET-10', name: '10-inch Tablet', price: 12999.00, stock: 75, brand: 'TabPro', category: 'Tablets', productType: 'Tablets' },
      { sku: 'ELEC-SPEAKER-BT', name: 'Bluetooth Speaker', price: 2999.00, stock: 200, brand: 'SoundWave', category: 'Audio', productType: 'Speakers' },
      { sku: 'ELEC-CAMERA-4K', name: '4K Action Camera', price: 8999.00, stock: 60, brand: 'ActionCam', category: 'Cameras', productType: 'Cameras' },
      { sku: 'ELEC-SMARTWATCH', name: 'Smart Watch Pro', price: 5999.00, stock: 120, brand: 'WearTech', category: 'Wearables', productType: 'Wearables' },
      { sku: 'ELEC-CHARGER-WIRELESS', name: 'Wireless Charger', price: 1999.00, stock: 300, brand: 'ChargeMax', category: 'Accessories', productType: 'Chargers' },
      { sku: 'ELEC-KEYBOARD-MECH', name: 'Mechanical Keyboard', price: 3999.00, stock: 80, brand: 'KeyMaster', category: 'Accessories', productType: 'Keyboards' },
      { sku: 'ELEC-MOUSE-GAMING', name: 'Gaming Mouse RGB', price: 2499.00, stock: 150, brand: 'GameGear', category: 'Accessories', productType: 'Mice' },
      { sku: 'ELEC-MONITOR-27', name: '27-inch Gaming Monitor', price: 18999.00, stock: 30, brand: 'DisplayPro', category: 'Monitors', productType: 'Monitors' },
      { sku: 'ELEC-WEBCAM-4K', name: '4K Webcam Pro', price: 6999.00, stock: 90, brand: 'StreamCam', category: 'Accessories', productType: 'Webcams' },
      { sku: 'ELEC-ROUTER-WIFI6', name: 'WiFi 6 Router', price: 12999.00, stock: 40, brand: 'NetMax', category: 'Networking', productType: 'Routers' },
      { sku: 'ELEC-POWERBANK-20K', name: '20,000mAh Power Bank', price: 3499.00, stock: 180, brand: 'PowerMax', category: 'Accessories', productType: 'Power Banks' }
    ];

    for (const product of electronicsDockerProducts) {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category_id,subcategory_id,product_type_id,price,stock,attributes,images) SELECT u.user_id,'${product.name}','${product.sku}','${product.name} - High quality ${product.category.toLowerCase()}','${product.brand}',c.category_id,sc.subcategory_id,pt.product_type_id,${product.price},${product.stock},'{\\\"color\\\":\\\"black\\\",\\\"warranty\\\":\\\"1 year\\\"}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb FROM users u, categories c, subcategories sc, product_types pt WHERE u.email='electronics.owner@example.com' AND c.name='Electronics' AND sc.name='${product.category}' AND sc.category_id=c.category_id AND pt.name='${product.productType}' AND pt.subcategory_id=sc.subcategory_id AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }
    // Cosmetics products (15 total)
    const cosmeticsDockerProducts = [
      { sku: 'COS-SERUM-30', name: 'Hydrating Serum 30ml', price: 1299.00, stock: 200, brand: 'GlowUp', category: 'Skincare', productType: 'Serums' },
      { sku: 'COS-LIP-MATTE', name: 'Matte Lipstick', price: 499.00, stock: 300, brand: 'Chroma', category: 'Makeup', productType: 'Lipstick' },
      { sku: 'COS-FOUNDATION-30', name: 'Full Coverage Foundation', price: 899.00, stock: 150, brand: 'BeautyBase', category: 'Makeup', productType: 'Foundation' },
      { sku: 'COS-MASCARA-VOL', name: 'Volumizing Mascara', price: 599.00, stock: 250, brand: 'LashPro', category: 'Makeup', productType: 'Mascara' },
      { sku: 'COS-CLEANSER-GEL', name: 'Gentle Gel Cleanser', price: 699.00, stock: 180, brand: 'PureSkin', category: 'Skincare', productType: 'Face Wash' },
      { sku: 'COS-MOISTURIZER-50', name: 'Anti-Aging Moisturizer', price: 1499.00, stock: 120, brand: 'AgeDefy', category: 'Skincare', productType: 'Moisturizers' },
      { sku: 'COS-EYESHADOW-PAL', name: 'Eyeshadow Palette', price: 1299.00, stock: 100, brand: 'ColorPop', category: 'Makeup', productType: 'Eyeshadow' },
      { sku: 'COS-SUNSCREEN-SPF50', name: 'SPF 50 Sunscreen', price: 799.00, stock: 200, brand: 'SunGuard', category: 'Skincare', productType: 'Sun Protection' },
      { sku: 'COS-CONCEALER-FULL', name: 'Full Coverage Concealer', price: 649.00, stock: 175, brand: 'HideIt', category: 'Makeup', productType: 'Concealer' },
      { sku: 'COS-TONER-200', name: 'Hydrating Toner', price: 549.00, stock: 160, brand: 'Refresh', category: 'Skincare', productType: 'Toners' },
      { sku: 'COS-LIPGLOSS-SHINE', name: 'Shiny Lip Gloss', price: 399.00, stock: 220, brand: 'Glossy', category: 'Makeup', productType: 'Lip Gloss' },
      { sku: 'COS-FACEMASK-5PACK', name: 'Hydrating Face Mask 5-pack', price: 999.00, stock: 80, brand: 'MaskCare', category: 'Skincare', productType: 'Masks' },
      { sku: 'COS-BLUSH-PINK', name: 'Pink Blush Compact', price: 749.00, stock: 140, brand: 'Cheeky', category: 'Makeup', productType: 'Blush' },
      { sku: 'COS-EYELINER-WING', name: 'Winged Eyeliner Pen', price: 449.00, stock: 190, brand: 'WingMaster', category: 'Makeup', productType: 'Eyeliner' },
      { sku: 'COS-EXFOLIATOR-SCRUB', name: 'Gentle Exfoliating Scrub', price: 899.00, stock: 110, brand: 'SmoothSkin', category: 'Skincare', productType: 'Exfoliators' }
    ];

    for (const product of cosmeticsDockerProducts) {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category_id,subcategory_id,product_type_id,price,stock,attributes,images) SELECT u.user_id,'${product.name}','${product.sku}','${product.name} - Premium ${product.category.toLowerCase()}','${product.brand}',c.category_id,sc.subcategory_id,pt.product_type_id,${product.price},${product.stock},'{\\\"skin_type\\\":\\\"all\\\",\\\"cruelty_free\\\":true}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb FROM users u, categories c, subcategories sc, product_types pt WHERE u.email='cosmetics.owner@example.com' AND c.name='Beauty & Cosmetics' AND sc.name='${product.category}' AND sc.category_id=c.category_id AND pt.name='${product.productType}' AND pt.subcategory_id=sc.subcategory_id AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
    }

    // Food & Drinks products (15 total)
    const foodDockerProducts = [
      { sku: 'FOOD-CBREW-1L', name: 'Cold Brew Coffee 1L', price: 299.00, stock: 150, brand: 'BrewLab', category: 'Beverages', productType: 'Coffee' },
      { sku: 'FOOD-PROTBAR-12', name: 'Protein Snack Bars (12-pack)', price: 799.00, stock: 120, brand: 'NutriBite', category: 'Snacks', productType: 'Healthy Snacks' },
      { sku: 'FOOD-GRANOLA-500G', name: 'Organic Granola 500g', price: 449.00, stock: 200, brand: 'NatureCrunch', category: 'Breakfast', productType: 'Cereal' },
      { sku: 'FOOD-SMOOTHIE-MIX', name: 'Superfood Smoothie Mix', price: 599.00, stock: 100, brand: 'GreenBoost', category: 'Supplements', productType: 'Protein Supplements' },
      { sku: 'FOOD-CHOCOLATE-DARK', name: 'Dark Chocolate 70%', price: 349.00, stock: 300, brand: 'CocoaPure', category: 'Confectionery', productType: 'Chocolate' },
      { sku: 'FOOD-NUTS-MIXED', name: 'Mixed Nuts 250g', price: 399.00, stock: 180, brand: 'NuttyGood', category: 'Snacks', productType: 'Nuts' },
      { sku: 'FOOD-TEA-GREEN', name: 'Green Tea Bags (50-pack)', price: 249.00, stock: 250, brand: 'TeaLeaf', category: 'Beverages', productType: 'Tea' },
      { sku: 'FOOD-HONEY-RAW', name: 'Raw Honey 500g', price: 699.00, stock: 80, brand: 'BeePure', category: 'Sweeteners', productType: 'Honey' },
      { sku: 'FOOD-CRACKERS-SEED', name: 'Seed Crackers 200g', price: 299.00, stock: 150, brand: 'CrispySeed', category: 'Snacks', productType: 'Crackers' },
      { sku: 'FOOD-JUICE-ORGANIC', name: 'Organic Apple Juice 1L', price: 199.00, stock: 200, brand: 'FruitFresh', category: 'Beverages', productType: 'Juice' },
      { sku: 'FOOD-SPICE-MIX', name: 'Gourmet Spice Mix Set', price: 899.00, stock: 60, brand: 'SpiceMaster', category: 'Seasonings', productType: 'Spices' },
      { sku: 'FOOD-CEREAL-HEALTHY', name: 'Healthy Cereal 500g', price: 549.00, stock: 120, brand: 'GrainGood', category: 'Breakfast', productType: 'Cereal' },
      { sku: 'FOOD-ENERGY-DRINK', name: 'Natural Energy Drink', price: 149.00, stock: 300, brand: 'EnergyBoost', category: 'Beverages', productType: 'Energy Drinks' },
      { sku: 'FOOD-DRIED-FRUIT', name: 'Mixed Dried Fruit 300g', price: 399.00, stock: 160, brand: 'FruitMix', category: 'Snacks', productType: 'Dried Fruits' },
      { sku: 'FOOD-SUPERFOOD-POWDER', name: 'Superfood Powder 200g', price: 1299.00, stock: 70, brand: 'SuperNutrients', category: 'Supplements', productType: 'Herbal Supplements' }
    ];

    for (const product of foodDockerProducts) {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO products (owner_user_id,name,sku,description,brand,category_id,subcategory_id,product_type_id,price,stock,attributes,images) SELECT u.user_id,'${product.name}','${product.sku}','${product.name} - Premium ${product.category.toLowerCase()}','${product.brand}',c.category_id,sc.subcategory_id,pt.product_type_id,${product.price},${product.stock},'{\\\"organic\\\":true,\\\"gluten_free\\\":true}'::jsonb,'[\\\"https://example.com/${product.sku.toLowerCase()}.jpg\\\"]'::jsonb FROM users u, categories c, subcategories sc, product_types pt WHERE u.email='food.owner@example.com' AND c.name='Food & Beverages' AND sc.name='${product.category}' AND sc.category_id=c.category_id AND pt.name='${product.productType}' AND pt.subcategory_id=sc.subcategory_id AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku='${product.sku}');"`, { stdio: 'inherit' });
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

    // Generate sales data for Docker
    console.log('🔄 Generating sales data...');
    
    // Get all products with their account info
    const productsResult = execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "SELECT p.product_id, p.account_id, p.price, s.shop_id FROM products p JOIN shops s ON s.account_id = p.account_id ORDER BY p.product_id;"`, { encoding: 'utf8' });
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
      const numSales = Math.floor(Math.random() * 11) + 5;
      
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
          execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO product_sales (account_id, product_id, shop_id, platform, sale_date, quantity_sold, unit_price, total_sales, order_id) VALUES (${randomProduct.account_id}, ${randomProduct.product_id}, ${randomProduct.shop_id}, '${platform}', '${saleDate}', ${quantity}, ${unitPrice.toFixed(2)}, ${totalSales.toFixed(2)}, '${orderId}');"`, { stdio: 'inherit' });
        } catch (error) {
          console.log(`⚠️ Failed to insert sale for product ${randomProduct.product_id}: ${error.message}`);
        }
      }
    }

    // Seed taxonomy data via Docker
    console.log('Seeding taxonomy data via Docker...');
    
    // Create taxonomy tables
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "CREATE TABLE IF NOT EXISTS categories (category_id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE, description TEXT, display_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"`, { stdio: 'inherit' });
    
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "CREATE TABLE IF NOT EXISTS subcategories (subcategory_id SERIAL PRIMARY KEY, category_id INTEGER REFERENCES categories(category_id) ON DELETE CASCADE, name VARCHAR(100) NOT NULL, description TEXT, display_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE (category_id, name));"`, { stdio: 'inherit' });
    
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "CREATE TABLE IF NOT EXISTS product_types (product_type_id SERIAL PRIMARY KEY, subcategory_id INTEGER REFERENCES subcategories(subcategory_id) ON DELETE CASCADE, name VARCHAR(100) NOT NULL, description TEXT, display_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE (subcategory_id, name));"`, { stdio: 'inherit' });

    // Seed categories
    const categories = ['Electronics', 'Fashion & Clothing', 'Beauty & Cosmetics', 'Home & Garden', 'Sports & Outdoors', 'Health & Wellness', 'Toys & Games', 'Books & Media', 'Automotive', 'Food & Beverages', 'Baby & Kids', 'Pet Supplies', 'Office Supplies', 'Jewelry & Accessories', 'Art & Crafts', 'Travel & Luggage', 'Industrial & Scientific'];
    for (let i = 0; i < categories.length; i++) {
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO categories (name, display_order, description) VALUES ('${categories[i]}', ${i + 1}, 'Products in the ${categories[i]} category') ON CONFLICT (name) DO NOTHING;"`, { stdio: 'inherit' });
    }

    // Seed subcategories (matching init-db.js - 17 categories)
    const subcategories = {
      'Electronics': ['TV & Video', 'Audio', 'Mobile', 'Computers', 'Tablets', 'Cameras', 'Wearables', 'Accessories', 'Monitors', 'Networking'],
      'Fashion & Clothing': ["Men's Clothing", "Women's Clothing", "Kids' Clothing", 'Shoes', 'Accessories', 'Underwear', 'Swimwear', 'Activewear'],
      'Beauty & Cosmetics': ['Skincare', 'Makeup', 'Hair Care', 'Fragrance', 'Personal Care', 'Tools & Brushes'],
      'Home & Garden': ['Furniture', 'Decor', 'Kitchen & Dining', 'Bedding', 'Bath', 'Garden Tools', 'Plants & Seeds', 'Lighting'],
      'Sports & Outdoors': ['Fitness Equipment', 'Outdoor Gear', 'Team Sports', 'Water Sports', 'Winter Sports', 'Cycling', 'Running', 'Yoga & Pilates'],
      'Health & Wellness': ['Supplements', 'Medical Supplies', 'Fitness Equipment', 'Personal Care', 'Therapy & Recovery', 'Monitoring Devices'],
      'Toys & Games': ['Action Figures', 'Board Games', 'Puzzles', 'Educational Toys', 'Outdoor Toys', 'Electronic Toys', 'Arts & Crafts'],
      'Books & Media': ['Books', 'Magazines', 'Digital Media', 'Music', 'Movies & TV', 'Video Games'],
      'Automotive': ['Car Parts', 'Accessories', 'Tools', 'Maintenance', 'Interior', 'Exterior'],
      'Food & Beverages': ['Beverages', 'Snacks', 'Breakfast', 'Supplements', 'Confectionery', 'Sweeteners', 'Seasonings'],
      'Baby & Kids': ['Baby Care', 'Feeding', 'Nursery', 'Safety', 'Toys', 'Clothing'],
      'Pet Supplies': ['Dog Supplies', 'Cat Supplies', 'Fish Supplies', 'Bird Supplies', 'Small Pet Supplies', 'Pet Food'],
      'Office Supplies': ['Stationery', 'Furniture', 'Technology', 'Storage', 'Presentation', 'Organization'],
      'Jewelry & Accessories': ['Necklaces', 'Rings', 'Earrings', 'Bracelets', 'Watches', 'Bags', 'Belts'],
      'Art & Crafts': ['Drawing Supplies', 'Painting', 'Sculpting', 'Crafting', 'Paper Crafts', 'Fabric Crafts'],
      'Travel & Luggage': ['Luggage', 'Travel Accessories', 'Travel Gear', 'Bags & Backpacks'],
      'Industrial & Scientific': ['Tools', 'Measuring Instruments', 'Safety Equipment', 'Lab Supplies']
    };

    for (const [categoryName, subcats] of Object.entries(subcategories)) {
      for (let i = 0; i < subcats.length; i++) {
        execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO subcategories (category_id, name, display_order, description) SELECT c.category_id, '${subcats[i]}', ${i + 1}, 'Products in the ${subcats[i]} subcategory' FROM categories c WHERE c.name = '${categoryName}' ON CONFLICT (category_id, name) DO NOTHING;"`, { stdio: 'inherit' });
      }
    }

    // Seed product types (comprehensive data for all subcategories)
    const productTypes = {
      'Electronics::TV & Video': ['Smart TVs', 'LED TVs', 'OLED TVs', 'Projectors', 'Streaming Devices', 'TV Accessories'],
      'Electronics::Audio': ['Headphones', 'Speakers', 'Earbuds', 'Microphones', 'Audio Cables', 'Amplifiers'],
      'Electronics::Mobile': ['Smartphones', 'Feature Phones', 'Mobile Accessories', 'Cases & Covers', 'Screen Protectors', 'Chargers'],
      'Electronics::Computers': ['Laptops', 'Desktops', 'Tablets', 'Computer Accessories', 'Monitors', 'Keyboards'],
      'Electronics::Gaming': ['Gaming Consoles', 'Gaming PCs', 'Gaming Accessories', 'Gaming Chairs', 'Gaming Headsets', 'Controllers'],
      'Fashion & Clothing::Men\'s Clothing': ['T-Shirts', 'Shirts', 'Pants', 'Jeans', 'Jackets', 'Suits'],
      'Fashion & Clothing::Women\'s Clothing': ['Dresses', 'Tops', 'Blouses', 'Skirts', 'Pants', 'Outerwear'],
      'Fashion & Clothing::Kids\' Clothing': ['Baby Clothes', 'Toddler Clothes', 'Kids Tops', 'Kids Bottoms', 'Kids Dresses', 'Kids Outerwear'],
      'Fashion & Clothing::Shoes': ['Men\'s Shoes', 'Women\'s Shoes', 'Kids\' Shoes', 'Sports Shoes', 'Casual Shoes', 'Formal Shoes'],
      'Fashion & Clothing::Socks': ['Men\'s Socks', 'Women\'s Socks', 'Kids\' Socks', 'Athletic Socks', 'Work Socks', 'Casual Socks'],
      'Beauty & Cosmetics::Skincare': ['Face Wash', 'Moisturizers', 'Serums', 'Masks', 'Sun Protection', 'Anti-Aging'],
      'Beauty & Cosmetics::Makeup': ['Foundation', 'Lipstick', 'Eyeshadow', 'Mascara', 'Blush', 'Concealer'],
      'Beauty & Cosmetics::Hair Care': ['Shampoo', 'Conditioner', 'Hair Styling', 'Hair Tools', 'Hair Treatments', 'Hair Accessories'],
      'Beauty & Cosmetics::Fragrance': ['Perfumes', 'Colognes', 'Body Sprays', 'Essential Oils', 'Scented Candles', 'Room Fragrances'],
      'Beauty & Cosmetics::Nail Care': ['Nail Polish', 'Nail Tools', 'Nail Treatments', 'Nail Art', 'Manicure Sets', 'Nail Accessories'],
      'Home & Garden::Furniture': ['Sofas', 'Tables', 'Chairs', 'Beds', 'Storage', 'Office Furniture'],
      'Home & Garden::Home Decor': ['Wall Art', 'Decorative Items', 'Candles', 'Vases', 'Mirrors', 'Clocks'],
      'Home & Garden::Kitchen & Dining': ['Cookware', 'Dinnerware', 'Kitchen Tools', 'Small Appliances', 'Storage Containers', 'Tableware'],
      'Home & Garden::Bedding': ['Bed Sheets', 'Pillows', 'Comforters', 'Blankets', 'Mattress Toppers', 'Bedding Sets'],
      'Home & Garden::Bath': ['Towels', 'Bath Mats', 'Shower Curtains', 'Bath Accessories', 'Bathroom Storage', 'Bathroom Decor'],
      'Sports & Outdoors::Fitness Equipment': ['Weights', 'Mats', 'Resistance Bands', 'Cardio Equipment', 'Yoga Props', 'Fitness Accessories'],
      'Sports & Outdoors::Team Sports': ['Basketball', 'Soccer', 'Football', 'Baseball', 'Tennis', 'Volleyball'],
      'Sports & Outdoors::Outdoor Recreation': ['Camping Gear', 'Hiking Equipment', 'Fishing Gear', 'Outdoor Clothing', 'Backpacks', 'Outdoor Accessories'],
      'Sports & Outdoors::Water Sports': ['Swimming Gear', 'Water Sports Equipment', 'Pool Accessories', 'Beach Gear', 'Water Safety', 'Aquatic Fitness'],
      'Sports & Outdoors::Winter Sports': ['Skiing Equipment', 'Snowboarding Gear', 'Winter Clothing', 'Ice Skating', 'Winter Accessories', 'Cold Weather Gear'],
      'Food & Beverages::Beverages': ['Water', 'Juice', 'Coffee', 'Tea', 'Energy Drinks', 'Soft Drinks'],
      'Food & Beverages::Snacks': ['Chips', 'Crackers', 'Nuts', 'Dried Fruits', 'Candy', 'Healthy Snacks'],
      'Food & Beverages::Pantry Staples': ['Rice', 'Pasta', 'Canned Goods', 'Spices', 'Cooking Oils', 'Baking Ingredients'],
      'Food & Beverages::Frozen Foods': ['Frozen Meals', 'Frozen Vegetables', 'Ice Cream', 'Frozen Desserts', 'Frozen Snacks', 'Frozen Beverages'],
      'Food & Beverages::Fresh Produce': ['Fruits', 'Vegetables', 'Herbs', 'Organic Produce', 'Seasonal Items', 'Fresh Herbs'],
      'Health & Wellness::Supplements': ['Vitamins', 'Minerals', 'Protein Supplements', 'Herbal Supplements', 'Sports Nutrition', 'Health Supplements'],
      'Health & Wellness::Medical Supplies': ['First Aid', 'Medical Devices', 'Health Monitors', 'Therapeutic Equipment', 'Medical Accessories', 'Health Tools'],
      'Health & Wellness::Personal Care': ['Oral Care', 'Hair Care', 'Skin Care', 'Body Care', 'Personal Hygiene', 'Wellness Products'],
      'Health & Wellness::Fitness & Exercise': ['Exercise Equipment', 'Fitness Accessories', 'Workout Gear', 'Fitness Apps', 'Exercise Programs', 'Fitness Tracking'],
      'Health & Wellness::Mental Health': ['Stress Relief', 'Meditation', 'Sleep Aids', 'Relaxation Products', 'Mental Wellness', 'Mindfulness Tools'],
      'Automotive::Car Parts': ['Engine Parts', 'Brake Parts', 'Suspension Parts', 'Electrical Parts', 'Body Parts', 'Interior Parts'],
      'Automotive::Car Accessories': ['Car Electronics', 'Car Interior', 'Car Exterior', 'Car Safety', 'Car Maintenance', 'Car Cleaning'],
      'Automotive::Motorcycle': ['Motorcycle Parts', 'Motorcycle Accessories', 'Motorcycle Gear', 'Motorcycle Maintenance', 'Motorcycle Safety', 'Motorcycle Storage'],
      'Automotive::Truck & Commercial': ['Truck Parts', 'Commercial Vehicle Parts', 'Heavy Duty Parts', 'Commercial Accessories', 'Fleet Maintenance', 'Commercial Tools'],
      'Automotive::RV & Trailer': ['RV Parts', 'Trailer Parts', 'RV Accessories', 'Trailer Accessories', 'RV Maintenance', 'Camping Vehicles'],
      'Books & Media::Books': ['Fiction', 'Non-Fiction', 'Textbooks', 'Children\'s Books', 'Reference Books', 'E-Books'],
      'Books & Media::Movies & TV': ['DVDs', 'Blu-rays', 'Digital Movies', 'TV Shows', 'Documentaries', 'Streaming Content'],
      'Books & Media::Music': ['CDs', 'Vinyl Records', 'Digital Music', 'Musical Instruments', 'Music Accessories', 'Audio Equipment'],
      'Books & Media::Video Games': ['Console Games', 'PC Games', 'Mobile Games', 'Gaming Accessories', 'Gaming Consoles', 'Gaming Software'],
      'Books & Media::Magazines': ['Fashion Magazines', 'Tech Magazines', 'Lifestyle Magazines', 'News Magazines', 'Specialty Magazines', 'Digital Magazines'],
      'Toys & Games::Action Figures': ['Superhero Figures', 'Movie Figures', 'Collectible Figures', 'Action Figure Accessories', 'Figure Sets', 'Collectible Toys'],
      'Toys & Games::Board Games': ['Strategy Games', 'Family Games', 'Party Games', 'Educational Games', 'Card Games', 'Puzzle Games'],
      'Toys & Games::Electronic Toys': ['Interactive Toys', 'Educational Toys', 'Remote Control Toys', 'Electronic Games', 'Smart Toys', 'Tech Toys'],
      'Toys & Games::Outdoor Toys': ['Playground Equipment', 'Sports Toys', 'Water Toys', 'Ride-On Toys', 'Outdoor Games', 'Active Toys'],
      'Toys & Games::Arts & Crafts': ['Art Supplies', 'Craft Materials', 'DIY Kits', 'Creative Tools', 'Art Accessories', 'Crafting Sets'],
      'Pet Supplies::Dogs': ['Dog Food', 'Dog Toys', 'Dog Accessories', 'Dog Grooming', 'Dog Health', 'Dog Training'],
      'Pet Supplies::Cats': ['Cat Food', 'Cat Toys', 'Cat Accessories', 'Cat Grooming', 'Cat Health', 'Cat Training'],
      'Pet Supplies::Fish & Aquatics': ['Fish Food', 'Aquarium Equipment', 'Fish Accessories', 'Aquatic Plants', 'Water Treatment', 'Aquarium Decor'],
      'Pet Supplies::Birds': ['Bird Food', 'Bird Cages', 'Bird Toys', 'Bird Accessories', 'Bird Health', 'Bird Care'],
      'Pet Supplies::Small Animals': ['Small Pet Food', 'Small Pet Cages', 'Small Pet Toys', 'Small Pet Accessories', 'Small Pet Health', 'Small Pet Care'],
      'Baby & Kids::Baby Gear': ['Strollers', 'Car Seats', 'Baby Carriers', 'High Chairs', 'Baby Monitors', 'Baby Safety'],
      'Baby & Kids::Nursery': ['Cribs', 'Changing Tables', 'Nursery Decor', 'Baby Bedding', 'Nursery Storage', 'Baby Furniture'],
      'Baby & Kids::Feeding': ['Baby Bottles', 'Baby Food', 'Feeding Accessories', 'High Chairs', 'Baby Utensils', 'Feeding Supplies'],
      'Baby & Kids::Diapering': ['Diapers', 'Diaper Bags', 'Changing Pads', 'Diaper Accessories', 'Potty Training', 'Diapering Supplies'],
      'Baby & Kids::Baby Care': ['Baby Bath', 'Baby Health', 'Baby Grooming', 'Baby Safety', 'Baby Care Products', 'Baby Essentials'],
      'Office & School::Office Supplies': ['Writing Supplies', 'Paper Products', 'Office Equipment', 'Filing Supplies', 'Office Accessories', 'Desk Organizers'],
      'Office & School::School Supplies': ['Backpacks', 'School Bags', 'Notebooks', 'Pens & Pencils', 'Art Supplies', 'School Accessories'],
      'Office & School::Electronics': ['Computers', 'Printers', 'Scanners', 'Office Software', 'Computer Accessories', 'Office Technology'],
      'Office & School::Furniture': ['Desks', 'Chairs', 'Filing Cabinets', 'Office Storage', 'Conference Tables', 'Office Furniture'],
      'Office & School::Business': ['Business Cards', 'Presentation Materials', 'Office Decor', 'Business Supplies', 'Professional Tools', 'Office Solutions'],
    };

    for (const [key, types] of Object.entries(productTypes)) {
      for (let i = 0; i < types.length; i++) {
        execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "INSERT INTO product_types (subcategory_id, name, display_order) SELECT s.subcategory_id, '${types[i]}', ${i + 1} FROM subcategories s JOIN categories c ON s.category_id = c.category_id WHERE c.name = '${key.split('::')[0]}' AND s.name = '${key.split('::')[1]}' ON CONFLICT (subcategory_id, name) DO NOTHING;"`, { stdio: 'inherit' });
      }
    }

    console.log('✅ Seeded roles, permissions, users, products, accounts, shops, listings, sales data, and taxonomy via Docker');
    return true;
  } catch (e) { console.error('Docker seed failed:', e.message); return false; }
}

async function main() {
  console.log('Populating database with roles, permissions, users, products, and taxonomy...');
  const okDirect = await seedDirect();
  // Always attempt Docker as well, to keep both targets in sync when available
  const okDocker = seedDocker();
  if (!okDirect && !okDocker) process.exitCode = 1;
}

main();


