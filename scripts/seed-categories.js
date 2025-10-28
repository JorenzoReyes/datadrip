// =========================================================================
// REVISED CATEGORY DATA WITH ADDITIONAL PRODUCT TYPES
// =========================================================================

const shopCategories = {
    // Electra Shop Categories
    'Electronics': {
        icon: '💻',
        description: 'Electronic devices and accessories',
        subcategories: {
            'TV & Video': ['Smart TV', 'Projector', 'Streaming Device', 'TV Mount'],
            'Audio': ['Noise-Cancelling Headphones', 'Bluetooth Speaker', 'Wireless Earbuds', 'Soundbar', 'Portable CD Player'],
            'Mobile': ['Smartphone', 'Feature Phone', 'Smartwatch'],
            'Computers': ['Laptop', 'Desktop PC', 'All-in-One'],
            'Tablets': ['Tablet', 'E-Reader', 'Stylus Pen'],
            'Cameras': ['Action Camera', 'Mirrorless Camera', 'Drone'],
            'Wearables': ['Smart Watch', 'Fitness Tracker', 'VR Headset'],
            'Accessories': ['Wireless Charger', 'Power Bank', 'Charging Cable', 'Screen Protector'],
            'Networking': ['Router', 'Mesh System', 'Smart Plug']
        }
    },
    'Appliances': {
        icon: '🏠',
        description: 'Major and small household appliances',
        subcategories: {
            'Kitchen': ['Refrigerator', 'Microwave Oven', 'Rice Cooker', 'Blender', 'Toaster', 'Electric Kettle', 'Air Fryer', 'Coffee Maker', 'Dishwasher'],
            'Laundry': ['Washing Machine', 'Steam Iron', 'Clothes Dryer', 'Garment Steamer'],
            'Climate': ['Air Conditioner', 'Stand Fan', 'Dehumidifier', 'Air Purifier'],
            'Cleaning': ['Cordless Vacuum Cleaner', 'Robot Vacuum', 'Wet/Dry Mop']
        }
    },
    'Peripherals': {
        icon: '🖱️',
        description: 'Computer input, output, and connectivity devices',
        subcategories: {
            'Input Devices': ['Mechanical Keyboard', 'Gaming Mouse', 'Wireless Keyboard', 'Trackpad'],
            'Video': ['Webcam', 'Monitor'],
            'Audio': ['USB Gaming Headset', 'USB Streaming Microphone', 'External Speakers'],
            'Display': ['Gaming Monitor', 'Ultra-Wide Monitor', 'Portable Monitor'],
            'Accessories': ['Gaming Mouse Pad', 'Wrist Rest', 'Monitor Stand'],
            'Connectivity': ['USB Hub', 'Laptop Docking Station', 'USB-C Multi Adapter', 'KVM Switch'],
            'Cables': ['HDMI Cable', 'DisplayPort Cable', 'Ethernet Cable'],
            'Cooling': ['Laptop Cooling Pad', 'External Fan']
        }
    },
    'Computer Components': {
        icon: '💾',
        description: 'Internal parts for building and upgrading computers',
        subcategories: {
            'Memory': ['RAM', 'Server RAM'],
            'Storage': ['NVMe SSD', 'Hard Drive', 'External Hard Drive', 'SATA SSD'],
            'Graphics': ['Graphics Card', 'Integrated Graphics'],
            'Processors': ['Processor', 'APU'],
            'Motherboards': ['Motherboard', 'Mini-ITX Board'],
            'Power': ['Power Supply', 'UPS'],
            'Cases': ['Gaming Case', 'Mid-Tower Case', 'Mini-ITX Case'],
            'Cooling': ['CPU Cooler', 'Case Fan', 'Liquid Cooler'],
            'Accessories': ['Thermal Paste', 'SATA Cable', 'Zip Ties']
        }
    },
    'Gaming': {
        icon: '🎮',
        description: 'Consoles, equipment, and accessories for gaming',
        subcategories: {
            'Consoles': ['Gaming Console', 'Handheld Console', 'Retro Console'],
            'Controllers': ['Wireless Controller', 'Racing Wheel', 'Fight Stick', 'Arcade Stick'],
            'Furniture': ['Gaming Chair', 'Gaming Desk', 'Monitor Arm'],
            'Audio': ['Gaming Headset', 'Mixamp'],
            'Peripherals': ['TKL Mechanical Gaming Keyboard', 'Ultra-Light Gaming Mouse', 'Gaming Webcam'],
            'Streaming': ['Game Capture Card', 'Green Screen', 'Stream Deck'],
            'VR': ['VR Headset', 'VR Controllers'],
            'Lighting': ['LED Strip', 'Smart Light Panels']
        }
    },

    // Cosma Beauty Shop Categories
    'Cosmetics': {
        icon: '💄',
        description: 'Products for beauty enhancement and makeup',
        subcategories: {
            'Makeup': ['Matte Lipstick', 'Full Coverage Foundation', 'Volumizing Mascara', 'Eyeshadow Palette', 'Full Coverage Concealer', 'Shiny Lip Gloss', 'Pink Blush Compact', 'Winged Eyeliner Pen', 'Setting Powder Translucent', 'Face Primer Smoothing', 'Bronzer Contour Palette', 'Eyebrow Kit with Brush', 'Lip Liner Set 5 Colors', 'Highlighter Glow Palette', 'Makeup Remover Wipes 50pc', 'BB Cream', 'Nail Polish']
        }
    },
    'Skincare': {
        icon: '💧',
        description: 'Products for facial and body skin care',
        subcategories: {
            'Serums': ['Hydrating Serum', 'Vitamin C Serum', 'Niacinamide Serum'],
            'Cleansers': ['Gentle Gel Cleanser', 'Micellar Water', 'Oil Cleanser', 'Foaming Cleanser'],
            'Moisturizers': ['Anti-Aging Moisturizer', 'Day Cream', 'Body Lotion'],
            'Sun Protection': ['SPF 50 Sunscreen', 'Tinted Sunscreen', 'After Sun Lotion'],
            'Toners': ['Hydrating Toner', 'Exfoliating Toner'],
            'Masks': ['Hydrating Face Mask', 'Clay Mask', 'Sheet Mask'],
            'Exfoliators': ['Gentle Exfoliating Scrub', 'Chemical Peel'],
            'Eye Care': ['Anti-Aging Eye Cream', 'Eye Serum'],
            'Essences': ['Brightening Essence'],
            'Night Care': ['Retinol Night Cream', 'Sleeping Mask']
        }
    },
    'Fashion': {
        icon: '👗',
        description: 'Apparel, footwear, and accessories',
        subcategories: {
            'Tops': ['Cotton T-Shirt', 'Polo Shirt', 'Sweater'],
            'Bottoms': ['Denim Jeans', 'Shorts', 'Skirt'],
            'Dresses': ['Summer Dress', 'Evening Gown', 'Jumpsuit'],
            'Shoes': ['Running Sneakers', 'Dress Shoes', 'Sandals', 'Boots'],
            'Outerwear': ['Windbreaker Jacket', 'Coat', 'Hoodie'],
            'Accessories': ['Leather Handbag', 'Polarized Sunglasses', 'Analog Wrist Watch', 'Leather Belt', 'Baseball Cap', 'Wool Scarf', 'Cotton Socks', 'Wallet', 'Tie']
        }
    },
    'Home & Living': {
        icon: '🛋️',
        description: 'Products for household comfort and decor',
        subcategories: {
            'Bedding': ['Memory Foam Pillow', 'Queen Size Blanket', 'Duvet Cover Set', 'Mattress Protector'],
            'Lighting': ['LED Desk Lamp', 'Floor Lamp', 'Smart Bulb'],
            'Window Treatments': ['Blackout Curtains Set', 'Blinds'],
            'Decor': ['Ceramic Flower Vase', 'Wall Mirror', 'Modern Wall Clock', 'Scented Candle Set', 'Wall Art', 'Picture Frame'],
            'Flooring': ['Area Rug', 'Doormat'],
            'Bath': ['Bath Towel', 'Shower Curtain', 'Bath Mat'],
            'Storage': ['Storage Organizer', 'Shelf', 'Drawer Dividers'],
            'Outdoor': ['Ceramic Plant Pot', 'Garden Tools', 'Patio Furniture']
        }
    },
    'Hair Care': {
        icon: '💇‍♀️',
        description: 'Products for hair cleansing, treatment, and styling',
        subcategories: {
            'Hair Care': ['Hydrating Shampoo', 'Smoothing Conditioner', 'Argan Hair Oil', 'Repairing Hair Mask', 'Shine Serum', 'Strong Hold Hair Spray', 'Styling Gel', 'Volumizing Foam', 'Keratin Treatment', 'Ionic Hair Dryer', 'Detangling Brush', 'Pro Hair Straightener', 'Curling Iron', 'Leave-in Conditioner']
        }
    },
    'Fragrances': {
        icon: '🌸',
        description: 'Perfumery, colognes, and home scent products',
        subcategories: {
            'Fragrance': ['Floral Eau de Parfum', 'Fresh Cologne', 'Citrus Body Spray', 'Woody Eau de Toilette', 'Lavender Reed Diffuser', 'Vanilla Scented Candle', 'Rose Body Mist', 'Essential Oil Set', 'Air Freshener Spray', 'Scented Body Lotion', 'Closet Sachet', 'Travel Perfume Roller', 'Car Diffuser']
        }
    },

    // Gusto Bites Shop Categories
    'Food': {
        icon: '🍞',
        description: 'Essential grocery items and pantry staples',
        subcategories: {
            'Breakfast': ['Organic Granola', 'Healthy Cereal', 'Rolled Oats', 'Pancake Mix', 'Jams & Spreads'],
            'Confectionery': ['Dark Chocolate', 'Milk Chocolate Bar', 'Gummy Candies'],
            'Sweeteners': ['Raw Honey', 'Agave Syrup', 'Stevia'],
            'Snacks': ['Mixed Dried Fruit', 'Nuts', 'Energy Bars'],
            'Pantry': ['Whole Wheat Pasta', 'Organic Brown Rice', 'Canned Beans', 'Baking Powder']
        }
    },
    'Drinks': {
        icon: '☕',
        description: 'Packaged beverages and drink mixes',
        subcategories: {
            'Beverages': ['Cold Brew Coffee', 'Green Tea Bags', 'Organic Apple Juice', 'Natural Energy Drink', 'Superfood Smoothie Mix', 'Sparkling Water', 'Almond Milk', 'Hot Chocolate Mix', 'Bottled Water']
        }
    },
    'Snacks': {
        icon: '🍿',
        description: 'Ready-to-eat savory and sweet treats',
        subcategories: {
            'Snacks': ['BBQ Potato Chips', 'Butter Popcorn', 'Chocolate Chip Cookies', 'Salted Pretzels', 'Trail Mix Deluxe', 'Cheese Crackers', 'Beef Jerky', 'Granola Bars', 'Gummy Bears', 'Hazelnut Wafer', 'Roasted Cashews', 'Rice Cakes', 'Dried Seaweed', 'Tortilla Chips']
        }
    },
    'Condiments & Sauces': {
        icon: '🍯',
        description: 'Sauces, dips, and spreads',
        subcategories: {
            'Condiments': ['Tomato Ketchup', 'Premium Soy Sauce', 'Mayonnaise', 'Hot Chili Sauce', 'Honey Mustard', 'Apple Cider Vinegar', 'BBQ Sauce Smokey', 'Worcestershire Sauce', 'Creamy Peanut Butter', 'Strawberry Jam', 'Extra Virgin Olive Oil', 'Mild Salsa Dip', 'Relish', 'Salad Dressing']
        }
    },
    'Baking Supplies': {
        icon: '🍰',
        description: 'Ingredients and materials for baking',
        subcategories: {
            'Baking Supplies': ['All-Purpose Flour', 'White Sugar', 'Instant Yeast', 'Baking Powder', 'Baking Soda', 'Vanilla Extract', 'Chocolate Chips', 'Cocoa Powder', 'Corn Starch', 'Brown Sugar', 'Unsalted Butter', 'Egg Powder', 'Food Coloring', 'Muffin Liners']
        }
    }
};

// =========================================================================
// REVISED SEEDING SCRIPT (Functional Code)
// =========================================================================

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
        return containers.length > 0 ? containers[0] : 'datadrip-postgres-1';
    } catch {
        return 'datadrip-postgres-1';
    }
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


async function seedDirect() {
    const pool = new Pool(getDatabaseConfig());

    try {
        console.log('🌱 Seeding categories, subcategories, and product types (direct)...');

        let categoryInsertValues = [];
        let categoryOrder = 1;

        // 1. Prepare Category SQL
        for (const catName in shopCategories) {
            const cat = shopCategories[catName];
            categoryInsertValues.push(`('${catName.replace(/'/g, "''")}', '${cat.description.replace(/'/g, "''")}', '${cat.icon.replace(/'/g, "''")}', ${categoryOrder++}, true)`);
        }

        const categoriesSql = `
            INSERT INTO categories (name, description, icon, display_order, is_active) VALUES
            ${categoryInsertValues.join(',\n\t\t\t')}
            ON CONFLICT (name) DO UPDATE SET
                description = EXCLUDED.description,
                icon = EXCLUDED.icon,
                display_order = EXCLUDED.display_order,
                is_active = EXCLUDED.is_active;
        `;

        await pool.query(categoriesSql);
        console.log(`✅ Inserted ${categoryInsertValues.length} categories`);


        // 2. Get category IDs
        const categoryResult = await pool.query('SELECT category_id, name FROM categories');
        const categoryMap = {};
        categoryResult.rows.forEach(row => {
            categoryMap[row.name] = row.category_id;
        });

        let subcategoryInsertValues = [];
        let subcategoriesCount = 0;
        let productTypeInsertValues = [];

        // 3. Prepare Subcategory and Product Type SQL
        for (const catName in shopCategories) {
            const categoryId = categoryMap[catName];
            if (!categoryId) continue;

            let subcategoryOrder = 1;
            for (const subName in shopCategories[catName].subcategories) {
                const productTypes = shopCategories[catName].subcategories[subName];

                // Subcategory SQL
                subcategoryInsertValues.push(`(${categoryId}, '${subName.replace(/'/g, "''")}', ${subcategoryOrder++}, true)`);
                subcategoriesCount++;

                // Product Type SQL (data collection)
                let productTypeOrder = 1;
                for (const ptName of productTypes) {
                    productTypeInsertValues.push({
                        categoryName: catName,
                        subName: subName,
                        name: ptName.replace(/'/g, "''"),
                        order: productTypeOrder++
                    });
                }
            }
        }

        const subcategoriesSql = `
            INSERT INTO subcategories (category_id, name, display_order, is_active) VALUES
            ${subcategoryInsertValues.join(',\n\t\t\t')}
            ON CONFLICT (category_id, name) DO UPDATE SET
                display_order = EXCLUDED.display_order,
                is_active = EXCLUDED.is_active;
        `;

        await pool.query(subcategoriesSql);
        console.log(`✅ Inserted ${subcategoriesCount} subcategories`);


        // 4. Get subcategory IDs
        const subcategoryResult = await pool.query('SELECT subcategory_id, name, category_id FROM subcategories');
        const subcategoryMap = {}; // Map: { 'categoryName:subName': subcategoryId }
        const categoryNameMap = {}; // Map: { categoryId: categoryName }
        categoryResult.rows.forEach(row => {
            categoryNameMap[row.category_id] = row.name;
        });

        subcategoryResult.rows.forEach(row => {
            const categoryName = categoryNameMap[row.category_id];
            if (categoryName) {
                subcategoryMap[`${categoryName}:${row.name}`] = row.subcategory_id;
            }
        });


        // 5. Insert Product Types (Now that we have the IDs)
        const finalProductTypeValues = productTypeInsertValues.map(pt => {
            const subcategoryId = subcategoryMap[`${pt.categoryName}:${pt.subName}`];
            if (!subcategoryId) {
                 // Should not happen if subcategories were inserted correctly
                 // console.warn(`Could not find subcategory ID for ${pt.categoryName}:${pt.subName}. Skipping product type ${pt.name}`);
                return null;
            }
            return `(${subcategoryId}, '${pt.name}', ${pt.order}, true)`;
        }).filter(val => val !== null);


        const productTypesSql = `
            INSERT INTO product_types (subcategory_id, name, display_order, is_active) VALUES
            ${finalProductTypeValues.join(',\n\t\t\t')}
            ON CONFLICT (subcategory_id, name) DO UPDATE SET
                display_order = EXCLUDED.display_order,
                is_active = EXCLUDED.is_active;
        `;

        await pool.query(productTypesSql);
        console.log(`✅ Inserted ${finalProductTypeValues.length} product types`);

        console.log('✅ Successfully seeded all categories, subcategories, and product types (direct)');

    } catch (error) {
        console.error('❌ Error seeding categories (direct):', error);
        throw error;
    } finally {
        await pool.end();
    }
}


function seedDocker() {
    if (!checkDockerAvailability() || !checkDockerPostgresRunning()) {
        console.log('🐳 Docker PostgreSQL not available, skipping Docker seeding');
        return true;
    }

    try {
        console.log('🌱 Seeding categories, subcategories, and product types (Docker)...');
        const containerName = getDockerContainerName();
        let categoryOrder = 1;
        let subcategoriesList = [];
        let productTypesList = [];

        // 1. Prepare Categories, Subcategories, and Product Types for Docker
        for (const catName in shopCategories) {
            const cat = shopCategories[catName];
            // Insert Category
            const escapedCatName = catName.replace(/'/g, "''");
            const escapedCatDesc = cat.description.replace(/'/g, "''");
            const catSql = `INSERT INTO categories (name, description, icon, display_order, is_active) VALUES ('${escapedCatName}', '${escapedCatDesc}', '${cat.icon}', ${categoryOrder++}, true) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, icon = EXCLUDED.icon, display_order = EXCLUDED.display_order, is_active = EXCLUDED.is_active;`;
            execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "${sqlEscape(catSql)}"`, { stdio: 'inherit' });

            // Prepare Subcategories and Product Types
            let subcategoryOrder = 1;
            for (const subName in cat.subcategories) {
                subcategoriesList.push({
                    category: catName,
                    name: subName,
                    order: subcategoryOrder++
                });
                let productTypeOrder = 1;
                for (const ptName of cat.subcategories[subName]) {
                    productTypesList.push({
                        category: catName,
                        subcategory: subName,
                        name: ptName,
                        order: productTypeOrder++
                    });
                }
            }
        }
        console.log(`✅ Inserted ${categoryOrder - 1} categories (Docker)`);


        // 2. Insert Subcategories
        let subcatCount = 0;
        for (const subcat of subcategoriesList) {
            const escapedSubName = subcat.name.replace(/'/g, "''");
            const escapedCatName = subcat.category.replace(/'/g, "''");
            const sql = `INSERT INTO subcategories (category_id, name, display_order, is_active) SELECT c.category_id, '${escapedSubName}', ${subcat.order}, true FROM categories c WHERE c.name = '${escapedCatName}' ON CONFLICT (category_id, name) DO UPDATE SET display_order = EXCLUDED.display_order, is_active = EXCLUDED.is_active;`;
            execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "${sqlEscape(sql)}"`, { stdio: 'inherit' });
            subcatCount++;
        }
        console.log(`✅ Inserted ${subcatCount} subcategories (Docker)`);


        // 3. Insert Product Types
        let ptCount = 0;
        for (const ptype of productTypesList) {
            const escapedPtName = ptype.name.replace(/'/g, "''");
            const escapedSubName = ptype.subcategory.replace(/'/g, "''");
            const escapedCatName = ptype.category.replace(/'/g, "''");
            // The query selects the category_id first, then finds the subcategory_id
            const sql = `
                INSERT INTO product_types (subcategory_id, name, display_order, is_active)
                SELECT s.subcategory_id, '${escapedPtName}', ${ptype.order}, true
                FROM subcategories s
                JOIN categories c ON s.category_id = c.category_id
                WHERE s.name = '${escapedSubName}' AND c.name = '${escapedCatName}'
                ON CONFLICT (subcategory_id, name) DO UPDATE SET
                    display_order = EXCLUDED.display_order,
                    is_active = EXCLUDED.is_active;
            `;
            execSync(`docker exec -i ${containerName} psql -U postgres -d datadrip -c "${sqlEscape(sql)}"`, { stdio: 'inherit' });
            ptCount++;
        }
        console.log(`✅ Inserted ${ptCount} product types (Docker)`);

        console.log('✅ Successfully seeded all categories, subcategories, and product types (Docker)');
        return true;
    } catch (error) {
        console.error('❌ Error seeding categories (Docker):', error);
        return false;
    }
}

/**
 * Utility function to escape SQL for Docker exec.
 * Handles escaping quotes within the entire SQL string for the shell.
 * NOTE: The data values themselves are escaped inside the loops (e.g., in seedDirect)
 */
function sqlEscape(sql) {
    // Escapes single quotes inside the SQL string for the psql -c command
    return sql.replace(/"/g, '\\"');
}


// Main execution logic following seed-roles.js pattern
async function main() {
    console.log('🌱 Starting category seeding...');

    try {
        // Try direct seeding first (for local PostgreSQL or DATABASE_URL)
        const config = getDatabaseConfig();
        if (config.connectionString) {
            console.log('🔗 Using DATABASE_URL - seeding directly');
            await seedDirect();
        } else {
            // Check if we should use Docker or local
            const isDocker = checkDockerAvailability() && checkDockerPostgresRunning();
            if (isDocker) {
                console.log('🐳 Docker PostgreSQL detected - seeding via Docker');
                const dockerSuccess = seedDocker();
                if (!dockerSuccess) {
                    console.log('⚠️  Docker seeding failed, trying direct seeding...');
                    await seedDirect();
                }
            } else {
                console.log('💻 Using local PostgreSQL - seeding directly');
                await seedDirect();
            }
        }

        console.log('✅ Category seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Category seeding failed:', error);
        process.exit(1);
    }
}

// Run the seeding
main();