#!/usr/bin/env node

/**
 * Database initialization script
 * This script initializes the database with required tables and data
 * Uses Docker PostgreSQL container
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

// Database configuration - Docker only
function getDatabaseConfig() {
  // Prefer DATABASE_URL when provided (e.g., Railway)
  if (process.env.DATABASE_URL) {
    console.log('🔗 Using DATABASE_URL environment variable');
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    };
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

// Seed taxonomy data
async function seedTaxonomyData(pool) {
  try {
    console.log('Seeding taxonomy data...');
    
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

    // Subcategories (simplified version - full data would be extensive)
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

    // Product Types (sample data for key subcategories)
    const productTypes = {
      'Electronics::TV & Video': ['Smart TVs', 'LED TVs', 'Projectors', 'Streaming Devices', 'TV Accessories'],
      'Electronics::Audio': ['Headphones', 'Speakers', 'Earbuds', 'Microphones', 'Audio Cables'],
      'Electronics::Mobile': ['Smartphones', 'Feature Phones', 'Mobile Accessories', 'Cases & Covers', 'Screen Protectors'],
      'Electronics::Computers': ['Laptops', 'Desktops', 'Computer Accessories', 'Monitors', 'Keyboards'],
      'Electronics::Tablets': ['Tablets', 'Tablet Cases', 'Styluses', 'Tablet Stands', 'Tablet Accessories'],
      'Electronics::Cameras': ['DSLR Cameras', 'Action Cameras', 'Camera Lenses', 'Tripods', 'Camera Bags'],
      'Electronics::Wearables': ['Smartwatches', 'Fitness Trackers', 'VR Headsets', 'Health Monitors', 'Wearable Accessories'],
      'Electronics::Accessories': ['Cases & Covers', 'Chargers', 'Cables', 'Screen Protectors', 'Phone Accessories'],
      'Electronics::Monitors': ['Gaming Monitors', '4K Monitors', 'Ultrawide Monitors', 'Monitor Stands', 'Display Cables'],
      'Electronics::Networking': ['Routers', 'WiFi Extenders', 'Network Switches', 'Modems', 'Ethernet Cables'],
      'Fashion & Clothing::Men\'s Clothing': ['T-Shirts', 'Shirts', 'Pants', 'Jeans', 'Jackets'],
      'Fashion & Clothing::Women\'s Clothing': ['Dresses', 'Tops', 'Blouses', 'Skirts', 'Outerwear'],
      'Fashion & Clothing::Kids\' Clothing': ['Baby Clothes', 'Kids Tops', 'Kids Bottoms', 'Kids Dresses', 'Kids Outerwear'],
      'Fashion & Clothing::Shoes': ['Men\'s Shoes', 'Women\'s Shoes', 'Kids\' Shoes', 'Sports Shoes', 'Casual Shoes'],
      'Fashion & Clothing::Accessories': ['Bags', 'Wallets', 'Belts', 'Hats', 'Sunglasses'],
      'Fashion & Clothing::Underwear': ['Men\'s Underwear', 'Women\'s Underwear', 'Socks', 'Hosiery', 'Loungewear'],
      'Fashion & Clothing::Swimwear': ['Swimsuits', 'Bikinis', 'Swim Trunks', 'Cover-ups', 'Swim Accessories'],
      'Fashion & Clothing::Activewear': ['Sports Bras', 'Athletic Tops', 'Athletic Bottoms', 'Gym Wear', 'Yoga Wear'],
      'Beauty & Cosmetics::Skincare': ['Face Wash', 'Moisturizers', 'Serums', 'Masks', 'Sun Protection'],
      'Beauty & Cosmetics::Makeup': ['Foundation', 'Lipstick', 'Eyeshadow', 'Mascara', 'Blush'],
      'Beauty & Cosmetics::Hair Care': ['Shampoo', 'Conditioner', 'Hair Styling', 'Hair Treatments', 'Hair Tools'],
      'Beauty & Cosmetics::Fragrance': ['Perfumes', 'Colognes', 'Body Sprays', 'Essential Oils', 'Scented Candles'],
      'Beauty & Cosmetics::Personal Care': ['Body Wash', 'Deodorants', 'Oral Care', 'Personal Hygiene', 'Wellness Products'],
      'Beauty & Cosmetics::Tools & Brushes': ['Makeup Brushes', 'Beauty Tools', 'Hair Brushes', 'Cosmetic Sponges', 'Beauty Accessories'],
      'Home & Garden::Furniture': ['Sofas', 'Tables', 'Chairs', 'Beds', 'Storage'],
      'Home & Garden::Decor': ['Wall Art', 'Decorative Items', 'Candles', 'Vases', 'Mirrors'],
      'Home & Garden::Kitchen & Dining': ['Cookware', 'Dinnerware', 'Kitchen Tools', 'Storage Containers', 'Tableware'],
      'Home & Garden::Bedding': ['Bed Sheets', 'Pillows', 'Comforters', 'Blankets', 'Bedding Sets'],
      'Home & Garden::Bath': ['Towels', 'Bath Mats', 'Bath Accessories', 'Bathroom Storage', 'Bathroom Decor'],
      'Home & Garden::Garden Tools': ['Hand Tools', 'Power Tools', 'Watering Tools', 'Garden Supplies', 'Outdoor Equipment'],
      'Home & Garden::Plants & Seeds': ['Seeds', 'Seedlings', 'Plants', 'Soil', 'Plant Care'],
      'Home & Garden::Lighting': ['Table Lamps', 'Floor Lamps', 'Ceiling Lights', 'LED Lights', 'Lighting Accessories'],
      'Sports & Outdoors::Fitness Equipment': ['Weights', 'Mats', 'Resistance Bands', 'Cardio Equipment', 'Yoga Props'],
      'Sports & Outdoors::Outdoor Gear': ['Camping Gear', 'Hiking Equipment', 'Fishing Gear', 'Outdoor Clothing', 'Backpacks'],
      'Sports & Outdoors::Team Sports': ['Basketball', 'Soccer', 'Football', 'Baseball', 'Tennis'],
      'Sports & Outdoors::Water Sports': ['Swimming Gear', 'Water Sports Equipment', 'Pool Accessories', 'Beach Gear', 'Water Safety'],
      'Sports & Outdoors::Winter Sports': ['Skiing Equipment', 'Snowboarding Gear', 'Winter Clothing', 'Ice Skating', 'Winter Accessories'],
      'Sports & Outdoors::Cycling': ['Bicycles', 'Cycling Accessories', 'Safety Gear', 'Cycling Clothing', 'Bike Maintenance'],
      'Sports & Outdoors::Running': ['Running Shoes', 'Running Gear', 'Running Accessories', 'Fitness Trackers', 'Hydration'],
      'Sports & Outdoors::Yoga & Pilates': ['Yoga Mats', 'Yoga Blocks', 'Resistance Bands', 'Yoga Clothing', 'Meditation Cushions'],
      'Health & Wellness::Supplements': ['Vitamins', 'Minerals', 'Protein Supplements', 'Herbal Supplements', 'Sports Nutrition'],
      'Health & Wellness::Medical Supplies': ['First Aid', 'Medical Devices', 'Health Monitors', 'Therapeutic Equipment', 'Medical Accessories'],
      'Health & Wellness::Fitness Equipment': ['Exercise Equipment', 'Fitness Accessories', 'Workout Gear', 'Fitness Apps', 'Exercise Programs'],
      'Health & Wellness::Personal Care': ['Oral Care', 'Hair Care', 'Skin Care', 'Body Care', 'Personal Hygiene'],
      'Health & Wellness::Therapy & Recovery': ['Massage Tools', 'Compression Gear', 'Recovery Equipment', 'Therapy Accessories', 'Pain Relief'],
      'Health & Wellness::Monitoring Devices': ['Blood Pressure Monitors', 'Thermometers', 'Health Trackers', 'Scales', 'Health Monitors'],
      'Toys & Games::Action Figures': ['Superhero Figures', 'Movie Figures', 'Collectible Figures', 'Action Sets', 'Collectible Toys'],
      'Toys & Games::Board Games': ['Strategy Games', 'Family Games', 'Party Games', 'Educational Games', 'Card Games'],
      'Toys & Games::Puzzles': ['Jigsaw Puzzles', '3D Puzzles', 'Brain Teasers', 'Logic Puzzles', 'Kids Puzzles'],
      'Toys & Games::Educational Toys': ['STEM Toys', 'Learning Toys', 'Building Sets', 'Educational Games', 'Science Kits'],
      'Toys & Games::Outdoor Toys': ['Playground Equipment', 'Sports Toys', 'Water Toys', 'Ride-On Toys', 'Outdoor Games'],
      'Toys & Games::Electronic Toys': ['Interactive Toys', 'Remote Control Toys', 'Electronic Games', 'Smart Toys', 'Tech Toys'],
      'Toys & Games::Arts & Crafts': ['Art Supplies', 'Craft Materials', 'DIY Kits', 'Creative Tools', 'Crafting Sets'],
      'Books & Media::Books': ['Fiction', 'Non-Fiction', 'Textbooks', 'Children\'s Books', 'E-Books'],
      'Books & Media::Magazines': ['Fashion Magazines', 'Tech Magazines', 'Lifestyle Magazines', 'News Magazines', 'Specialty Magazines'],
      'Books & Media::Digital Media': ['E-Books', 'Digital Magazines', 'Online Courses', 'Audio Books', 'Digital Content'],
      'Books & Media::Music': ['CDs', 'Vinyl Records', 'Digital Music', 'Musical Instruments', 'Music Accessories'],
      'Books & Media::Movies & TV': ['DVDs', 'Blu-rays', 'Digital Movies', 'TV Shows', 'Documentaries'],
      'Books & Media::Video Games': ['Console Games', 'PC Games', 'Mobile Games', 'Gaming Accessories', 'Gaming Software'],
      'Automotive::Car Parts': ['Engine Parts', 'Brake Parts', 'Suspension Parts', 'Electrical Parts', 'Body Parts'],
      'Automotive::Accessories': ['Car Electronics', 'Car Interior', 'Car Exterior', 'Car Safety', 'Car Maintenance'],
      'Automotive::Tools': ['Auto Tools', 'Diagnostic Equipment', 'Lifting Equipment', 'Auto Repair Tools', 'Maintenance Tools'],
      'Automotive::Maintenance': ['Oil & Fluids', 'Filters', 'Car Care Products', 'Cleaning Supplies', 'Maintenance Kits'],
      'Automotive::Interior': ['Seat Covers', 'Floor Mats', 'Dash Accessories', 'Car Organizers', 'Interior Protection'],
      'Automotive::Exterior': ['Car Covers', 'Body Kits', 'Exterior Accessories', 'Protection Film', 'External Enhancements'],
      'Food & Beverages::Beverages': ['Water', 'Juice', 'Coffee', 'Tea', 'Energy Drinks'],
      'Food & Beverages::Snacks': ['Chips', 'Crackers', 'Nuts', 'Dried Fruits', 'Trail Mix'],
      'Food & Beverages::Breakfast': ['Cereal', 'Oatmeal', 'Granola', 'Breakfast Bars', 'Morning Drinks'],
      'Food & Beverages::Supplements': ['Vitamins', 'Minerals', 'Protein Supplements', 'Herbal Supplements', 'Nutrition Products'],
      'Food & Beverages::Confectionery': ['Chocolates', 'Candies', 'Desserts', 'Sweet Treats', 'Confections'],
      'Food & Beverages::Sweeteners': ['Sugar', 'Honey', 'Syrups', 'Artificial Sweeteners', 'Natural Sweeteners'],
      'Food & Beverages::Seasonings': ['Spices', 'Herbs', 'Seasoning Blends', 'Condiments', 'Sauces'],
      'Baby & Kids::Baby Care': ['Baby Bath', 'Baby Health', 'Baby Grooming', 'Baby Safety', 'Baby Care Products'],
      'Baby & Kids::Feeding': ['Baby Bottles', 'Baby Food', 'Feeding Accessories', 'Baby Utensils', 'Feeding Supplies'],
      'Baby & Kids::Nursery': ['Cribs', 'Changing Tables', 'Nursery Decor', 'Baby Bedding', 'Nursery Storage'],
      'Baby & Kids::Safety': ['Baby Gates', 'Outlet Covers', 'Safety Locks', 'Baby Monitors', 'Safety Equipment'],
      'Baby & Kids::Toys': ['Baby Toys', 'Educational Toys', 'Rattles', 'Teething Toys', 'Soft Toys'],
      'Baby & Kids::Clothing': ['Baby Clothes', 'Toddler Clothes', 'Kids Clothing', 'Outfits', 'Accessories'],
      'Pet Supplies::Dog Supplies': ['Dog Food', 'Dog Toys', 'Dog Accessories', 'Dog Grooming', 'Dog Health'],
      'Pet Supplies::Cat Supplies': ['Cat Food', 'Cat Toys', 'Cat Accessories', 'Cat Grooming', 'Cat Health'],
      'Pet Supplies::Fish Supplies': ['Fish Food', 'Aquarium Equipment', 'Fish Accessories', 'Water Treatment', 'Aquarium Decor'],
      'Pet Supplies::Bird Supplies': ['Bird Food', 'Bird Cages', 'Bird Toys', 'Bird Accessories', 'Bird Health'],
      'Pet Supplies::Small Pet Supplies': ['Small Pet Food', 'Small Pet Cages', 'Small Pet Toys', 'Small Pet Accessories', 'Small Pet Care'],
      'Pet Supplies::Pet Food': ['Dry Food', 'Wet Food', 'Treats', 'Raw Food', 'Specialty Food'],
      'Office Supplies::Stationery': ['Pens', 'Pencils', 'Notebooks', 'Paper Products', 'Writing Accessories'],
      'Office Supplies::Furniture': ['Desks', 'Chairs', 'Filing Cabinets', 'Office Storage', 'Conference Tables'],
      'Office Supplies::Technology': ['Computers', 'Printers', 'Scanners', 'Office Software', 'Computer Accessories'],
      'Office Supplies::Storage': ['File Cabinets', 'Organizers', 'Storage Boxes', 'Desk Organizers', 'Storage Solutions'],
      'Office Supplies::Presentation': ['Projectors', 'Presentation Boards', 'Binders', 'Presentation Accessories', 'Display Items'],
      'Office Supplies::Organization': ['Planners', 'Calendars', 'Post-it Notes', 'Labels', 'Organizational Tools'],
      'Jewelry & Accessories::Necklaces': ['Pendant Necklaces', 'Chain Necklaces', 'Chokers', 'Statement Necklaces', 'Layering Necklaces'],
      'Jewelry & Accessories::Rings': ['Engagement Rings', 'Wedding Rings', 'Fashion Rings', 'Adjustable Rings', 'Ring Sets'],
      'Jewelry & Accessories::Earrings': ['Stud Earrings', 'Hoop Earrings', 'Drop Earrings', 'Earring Sets', 'Earring Accessories'],
      'Jewelry & Accessories::Bracelets': ['Chain Bracelets', 'Bangle Bracelets', 'Cuff Bracelets', 'Bracelet Sets', 'Bracelet Accessories'],
      'Jewelry & Accessories::Watches': ['Smartwatches', 'Analog Watches', 'Digital Watches', 'Sport Watches', 'Watch Accessories'],
      'Jewelry & Accessories::Bags': ['Handbags', 'Tote Bags', 'Backpacks', 'Crossbody Bags', 'Evening Bags'],
      'Jewelry & Accessories::Belts': ['Leather Belts', 'Fabric Belts', 'Chain Belts', 'Belt Buckles', 'Belt Accessories'],
      'Art & Crafts::Drawing Supplies': ['Pencils', 'Charcoal', 'Drawing Paper', 'Drawing Boards', 'Drawing Accessories'],
      'Art & Crafts::Painting': ['Acrylic Paints', 'Watercolors', 'Oil Paints', 'Canvas', 'Painting Brushes'],
      'Art & Crafts::Sculpting': ['Clay', 'Modeling Tools', 'Sculpting Supplies', 'Wire Mesh', 'Sculpting Accessories'],
      'Art & Crafts::Crafting': ['Scrapbook Supplies', 'Stickers', 'Ribbons', 'Embellishments', 'Crafting Tools'],
      'Art & Crafts::Paper Crafts': ['Origami Paper', 'Cardstock', 'Craft Paper', 'Origami Supplies', 'Paper Craft Tools'],
      'Art & Crafts::Fabric Crafts': ['Fabric', 'Thread', 'Needles', 'Sewing Supplies', 'Fabric Embellishments'],
      'Travel & Luggage::Luggage': ['Suitcases', 'Carry-on Luggage', 'Luggage Sets', 'Travel Duffels', 'Travel Accessories'],
      'Travel & Luggage::Travel Accessories': ['Packing Cubes', 'Travel Organizers', 'Travel Toiletries', 'Travel Comfort', 'Travel Essentials'],
      'Travel & Luggage::Travel Gear': ['Backpacks', 'Travel Bags', 'Daypacks', 'Travel Security', 'Travel Gadgets'],
      'Travel & Luggage::Bags & Backpacks': ['Travel Backpacks', 'Daypacks', 'Laptop Backpacks', 'Hiking Backpacks', 'Travel Bags'],
      'Industrial & Scientific::Tools': ['Power Tools', 'Hand Tools', 'Measuring Tools', 'Tool Storage', 'Tool Accessories'],
      'Industrial & Scientific::Measuring Instruments': ['Rulers', 'Calipers', 'Multimeters', 'Measuring Devices', 'Precision Instruments'],
      'Industrial & Scientific::Safety Equipment': ['Hard Hats', 'Safety Glasses', 'Protective Gear', 'Safety Signs', 'Safety Equipment'],
      'Industrial & Scientific::Lab Supplies': ['Lab Equipment', 'Lab Chemicals', 'Lab Glassware', 'Lab Safety', 'Lab Accessories']
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

  // Categories table (product taxonomy)
  const createCategoriesTable = `
    CREATE TABLE IF NOT EXISTS categories (
      category_id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Subcategories table
  const createSubcategoriesTable = `
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
  `;

  // Product types table
  const createProductTypesTable = `
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
      category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
      subcategory_id INTEGER REFERENCES subcategories(subcategory_id) ON DELETE SET NULL,
      product_type_id INTEGER REFERENCES product_types(product_type_id) ON DELETE SET NULL,
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
      attributes JSONB,
      images JSONB,
      videos JSONB,
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
  
  // Create taxonomy tables before products
  await pool.query(createCategoriesTable);
  await pool.query(createSubcategoriesTable);
  await pool.query(createProductTypesTable);

  await pool.query(createShopsTable);
  await pool.query(createProductsTable);
  
  // Seed taxonomy data
  await seedTaxonomyData(pool);
  
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
    'CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);',
    'CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);',
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

    // Ensure product_sales.total_sales exists (defensive for older local setups)
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

    // Create categories table
    const createCategoriesTable = `
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${createCategoriesTable.replace(/\s+/g,' ').trim()}"`, { stdio: 'inherit' });

    // Create subcategories table
    const createSubcategoriesTable = `
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
    `;
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${createSubcategoriesTable.replace(/\s+/g,' ').trim()}"`, { stdio: 'inherit' });

    // Create product_types table
    const createProductTypesTable = `
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
    `;
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${createProductTypesTable.replace(/\s+/g,' ').trim()}"`, { stdio: 'inherit' });

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
        category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
        subcategory_id INTEGER REFERENCES subcategories(subcategory_id) ON DELETE SET NULL,
        product_type_id INTEGER REFERENCES product_types(product_type_id) ON DELETE SET NULL,
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
        attributes JSONB,
        images JSONB,
        videos JSONB,
        promotion_image TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${createProductsTable.replace(/\s+/g,' ').trim()}"`, { stdio: 'inherit' });


    // Create product_sales table
    const createProductSalesTable = `
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
    `;
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${createProductSalesTable.replace(/\s+/g,' ').trim()}"`, { stdio: 'inherit' });

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
      'CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);',
      'CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);',
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
    const dockerAvailable = checkDockerPostgresRunning();
    if (dockerAvailable) {
      const dockerSuccess = await initializeDatabaseWithDocker();
      if (!dockerSuccess) {
        console.warn('⚠️  Docker initialization failed.');
      }
    }
  } catch (error) {
    console.error('Database initialization encountered an error:', error);
    // Best effort Docker init even if direct path errored
    const dockerAvailable = checkDockerPostgresRunning();
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

