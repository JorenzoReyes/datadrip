import { query } from '../utils/database';

async function migrateVideoUrls() {
  try {
    console.log('Starting video URL migration...');
    
    // Get all products with videos
    const products = await query(`
      SELECT product_id, videos 
      FROM products 
      WHERE videos IS NOT NULL AND videos != '[]'::jsonb
    `);
    
    console.log(`Found ${products.length} products with videos`);
    
    let updatedCount = 0;
    
    for (const product of products) {
      const videos = product.videos;
      if (!videos || !Array.isArray(videos)) continue;
      
      let hasChanges = false;
      const updatedVideos = videos.map((url: string) => {
        // Convert old format to new format
        if (url.startsWith('/uploads/videos/')) {
          hasChanges = true;
          return url.replace('/uploads/videos/', '/api/uploads/videos/');
        }
        return url;
      });
      
      if (hasChanges) {
        await query(
          'UPDATE products SET videos = $1 WHERE product_id = $2',
          [JSON.stringify(updatedVideos), product.product_id]
        );
        updatedCount++;
        console.log(`Updated product ${product.product_id}: ${videos.join(', ')} -> ${updatedVideos.join(', ')}`);
      }
    }
    
    console.log(`Migration complete. Updated ${updatedCount} products.`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateVideoUrls().then(() => process.exit(0));
}

export default migrateVideoUrls;
