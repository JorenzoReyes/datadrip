import { query } from '../utils/database';

async function migrateImageUrls() {
  try {
    console.log('Starting image URL migration...');
    
    // Get all products with images
    const products = await query(`
      SELECT product_id, images, promotion_image 
      FROM products 
      WHERE (images IS NOT NULL AND images != '[]'::jsonb) 
         OR promotion_image IS NOT NULL
    `);
    
    console.log(`Found ${products.length} products with images`);
    
    let updatedCount = 0;
    
    for (const product of products) {
      let hasChanges = false;
      
      // Update images array
      if (product.images && Array.isArray(product.images)) {
        const updatedImages = product.images.map((url: string) => {
          if (url.startsWith('/uploads/products/')) {
            hasChanges = true;
            return url.replace('/uploads/products/', '/api/uploads/products/');
          }
          return url;
        });
        
        if (hasChanges) {
          await query(
            'UPDATE products SET images = $1 WHERE product_id = $2',
            [JSON.stringify(updatedImages), product.product_id]
          );
        }
      }
      
      // Update promotion_image
      if (product.promotion_image && product.promotion_image.startsWith('/uploads/products/')) {
        const updatedPromoImage = product.promotion_image.replace('/uploads/products/', '/api/uploads/products/');
        await query(
          'UPDATE products SET promotion_image = $1 WHERE product_id = $2',
          [updatedPromoImage, product.product_id]
        );
        hasChanges = true;
      }
      
      if (hasChanges) {
        updatedCount++;
        console.log(`Updated product ${product.product_id} images`);
      }
    }
    
    console.log(`Migration complete. Updated ${updatedCount} products.`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateImageUrls().then(() => process.exit(0));
}

export default migrateImageUrls;
