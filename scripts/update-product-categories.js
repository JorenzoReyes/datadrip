const { execSync } = require('child_process');

// Product category mapping based on the current seed data
const categoryMappings = {
  // Electronics
  'TV & Video': { category: 'Electronics', subcategory: 'TV & Video', product_type: 'Smart TV' },
  'Audio': { category: 'Electronics', subcategory: 'Audio', product_type: 'Headphones' },
  'Mobile': { category: 'Electronics', subcategory: 'Mobile', product_type: 'Smartphone' },
  'Computers': { category: 'Electronics', subcategory: 'Computers', product_type: 'Laptop' },
  'Tablets': { category: 'Electronics', subcategory: 'Tablets', product_type: 'Tablet' },
  'Cameras': { category: 'Electronics', subcategory: 'Cameras', product_type: 'Action Camera' },
  'Wearables': { category: 'Electronics', subcategory: 'Wearables', product_type: 'Smart Watch' },
  'Accessories': { category: 'Electronics', subcategory: 'Accessories', product_type: 'Charger' },
  'Monitors': { category: 'Electronics', subcategory: 'Monitors', product_type: 'Gaming Monitor' },
  'Networking': { category: 'Electronics', subcategory: 'Networking', product_type: 'Router' },
  
  // Cosmetics
  'Skincare': { category: 'Cosmetics', subcategory: 'Skincare', product_type: 'Serum' },
  'Makeup': { category: 'Cosmetics', subcategory: 'Makeup', product_type: 'Lipstick' },
  
  // Food
  'Beverages': { category: 'Food', subcategory: 'Beverages', product_type: 'Coffee' },
  'Snacks': { category: 'Food', subcategory: 'Snacks', product_type: 'Protein Bar' },
  'Breakfast': { category: 'Food', subcategory: 'Breakfast', product_type: 'Granola' },
  'Supplements': { category: 'Food', subcategory: 'Supplements', product_type: 'Smoothie Mix' },
  'Confectionery': { category: 'Food', subcategory: 'Confectionery', product_type: 'Chocolate' },
  'Sweeteners': { category: 'Food', subcategory: 'Sweeteners', product_type: 'Honey' },
  'Seasonings': { category: 'Food', subcategory: 'Seasonings', product_type: 'Spice Mix' }
};

async function updateProductCategories() {
  try {
    console.log('🔄 Updating product categories to 3-layer structure...');
    
    // First, add the product_type column if it doesn't exist
    console.log('📝 Adding product_type column...');
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(100);"`, { stdio: 'inherit' });
    
    // Update each category mapping
    for (const [oldCategory, newStructure] of Object.entries(categoryMappings)) {
      console.log(`🔄 Updating category: ${oldCategory} → ${newStructure.category}/${newStructure.subcategory}/${newStructure.product_type}`);
      
      const updateQuery = `
        UPDATE products 
        SET 
          category = '${newStructure.category}',
          subcategory = '${newStructure.subcategory}',
          product_type = '${newStructure.product_type}'
        WHERE category = '${oldCategory}';
      `;
      
      execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "${updateQuery}"`, { stdio: 'inherit' });
    }
    
    // Update any remaining products that don't match the mappings
    console.log('🔄 Updating remaining products...');
    execSync(`docker exec -i datadrip-postgres-1 psql -U postgres -d datadrip -c "
      UPDATE products 
      SET 
        category = COALESCE(category, 'Uncategorized'),
        subcategory = COALESCE(subcategory, 'General'),
        product_type = COALESCE(product_type, 'Standard')
      WHERE category IS NULL OR subcategory IS NULL OR product_type IS NULL;
    "`, { stdio: 'inherit' });
    
    console.log('✅ Product categories updated successfully!');
    console.log('📊 New 3-layer structure:');
    console.log('   Layer 1: Category (Electronics, Cosmetics, Food)');
    console.log('   Layer 2: Subcategory (TV & Video, Audio, Skincare, Makeup, etc.)');
    console.log('   Layer 3: Product Type (Smart TV, Headphones, Serum, Lipstick, etc.)');
    
  } catch (error) {
    console.error('❌ Error updating product categories:', error.message);
    process.exit(1);
  }
}

// Run the update
updateProductCategories();
