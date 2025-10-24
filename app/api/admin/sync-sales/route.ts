import { NextResponse } from 'next/server';
import { BusinessDataService } from '../../../services/businessDataService';
import { AuditLogService } from '../../../services/auditLogService';

export async function POST(req: Request) {
  try {
    const { userId, platform, businessOwnerEmail, forceSync } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // If this is an OAuth demo data linking request
    if (platform && businessOwnerEmail && forceSync) {
      const result = await linkOAuthToDemoData(userId, platform, businessOwnerEmail);
      return NextResponse.json(result);
    }

    // Regular sync request
    const result = await BusinessDataService.syncProductSalesData(userId);

    // Log database operation for audit
    AuditLogService.logDatabaseOperation(userId, 'sync_sales_data', 'products', false);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error syncing sales data:', error);
    return NextResponse.json(
      { error: 'Failed to sync sales data' },
      { status: 500 }
    );
  }
}

// Link OAuth integration to existing demo data
async function linkOAuthToDemoData(userId: string, platform: string, businessOwnerEmail: string) {
  try {
    console.log(`🔗 Linking OAuth integration for ${userId} to demo data from ${businessOwnerEmail} on ${platform}`);
    
    // Import database utilities
    const { query, queryOne } = await import('../../../utils/database');
    
    // Get the OAuth user's ID
    const oauthUser = await queryOne<{ user_id: number }>('SELECT user_id FROM users WHERE email = $1', [userId]);
    if (!oauthUser) {
      throw new Error('OAuth user not found');
    }
    
    // Get the business owner's account ID
    const businessOwner = await queryOne<{ user_id: number }>('SELECT user_id FROM users WHERE email = $1', [businessOwnerEmail]);
    if (!businessOwner) {
      throw new Error('Business owner not found');
    }
    
    const businessAccount = await queryOne<{ account_id: number }>('SELECT account_id FROM accounts WHERE owner_user_id = $1', [businessOwner.user_id]);
    if (!businessAccount) {
      throw new Error('Business account not found');
    }
    
    // Create a new account for the OAuth user that links to the demo business data
    // This allows the OAuth user to see the demo data in their dashboard
    const existingAccount = await queryOne<{ account_id: number }>('SELECT account_id FROM accounts WHERE owner_user_id = $1', [oauthUser.user_id]);
    
    if (!existingAccount) {
      // Create account for OAuth user
      await query(`
        INSERT INTO accounts (owner_user_id, name, status)
        VALUES ($1, $2, 'active')
      `, [oauthUser.user_id, `Demo Account - ${businessOwnerEmail.split('@')[0]}`]);
      
      console.log(`✅ Created account for OAuth user ${userId}`);
    }
    
    // Get the OAuth user's account
    const oauthAccount = await queryOne<{ account_id: number }>('SELECT account_id FROM accounts WHERE owner_user_id = $1', [oauthUser.user_id]);
    if (!oauthAccount) {
      throw new Error('Failed to create OAuth user account');
    }
    
    // Copy shops from business owner to OAuth user (for the specific platform)
    const businessShops = await query<{
      shop_id: number;
      name: string;
      platform: string;
      platform_shop_id: string;
      url: string;
      status: string;
      products_count: number | null;
      followers_count: number | null;
      following_count: number | null;
      chat_performance_percent: number | null;
      rating_value: number | null;
      rating_count: number | null;
      joined_at: string;
      metadata: Record<string, unknown>;
    }>(`
      SELECT shop_id, name, platform, platform_shop_id, url, status, products_count,
             followers_count, following_count, chat_performance_percent, rating_value,
             rating_count, joined_at, metadata
      FROM shops 
      WHERE account_id = $1 AND platform = $2
    `, [businessAccount.account_id, platform]);
    
    for (const shop of businessShops) {
      // Check if shop already exists for OAuth user
      const existingShop = await queryOne<{ shop_id: number }>(`
        SELECT shop_id FROM shops 
        WHERE account_id = $1 AND platform = $2 AND platform_shop_id = $3
      `, [oauthAccount.account_id, shop.platform, shop.platform_shop_id]);
      
      if (!existingShop) {
        // Copy shop to OAuth user's account
        await query(`
          INSERT INTO shops (account_id, name, platform, platform_shop_id, url, status, 
                           products_count, followers_count, following_count, chat_performance_percent,
                           rating_value, rating_count, joined_at, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          oauthAccount.account_id, shop.name, shop.platform, shop.platform_shop_id,
          shop.url, shop.status, shop.products_count, shop.followers_count,
          shop.following_count, shop.chat_performance_percent, shop.rating_value,
          shop.rating_count, shop.joined_at, JSON.stringify(shop.metadata)
        ]);
        
        console.log(`✅ Copied ${shop.platform} shop to OAuth user account`);
      }
    }
    
    // Copy products from business owner to OAuth user
    const businessProducts = await query<{
      product_id: number;
      name: string;
      sku: string;
      description: string;
      brand: string;
      category: string;
      subcategory: string;
      price: number;
      stock: number;
      attributes: Record<string, unknown>;
      images: string[];
      weight_value: number;
      weight_unit: string;
      length_cm: number;
      width_cm: number;
      height_cm: number;
    }>(`
      SELECT product_id, name, sku, description, brand, category, subcategory, price, stock,
             attributes, images, weight_value, weight_unit, length_cm, width_cm, height_cm
      FROM products 
      WHERE account_id = $1
    `, [businessAccount.account_id]);
    
    for (const product of businessProducts) {
      // Check if product already exists for OAuth user
      const existingProduct = await queryOne<{ product_id: number }>(`
        SELECT product_id FROM products WHERE account_id = $1 AND sku = $2
      `, [oauthAccount.account_id, product.sku]);
      
      if (!existingProduct) {
        // Copy product to OAuth user's account
        await query(`
          INSERT INTO products (owner_user_id, account_id, name, sku, description, brand, category, subcategory,
                              price, stock, attributes, images, weight_value, weight_unit, length_cm, width_cm, height_cm)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
          oauthUser.user_id, oauthAccount.account_id, product.name, product.sku,
          product.description, product.brand, product.category, product.subcategory,
          product.price, product.stock, JSON.stringify(product.attributes),
          JSON.stringify(product.images), product.weight_value, product.weight_unit,
          product.length_cm, product.width_cm, product.height_cm
        ]);
        
        console.log(`✅ Copied product ${product.sku} to OAuth user account`);
      }
    }
    
    // Copy sales data from business owner to OAuth user
    const businessSales = await query<{
      product_id: number;
      shop_id: number;
      platform: string;
      sale_date: string;
      quantity_sold: number;
      unit_price: number;
      total_sales: number;
      order_id: string;
    }>(`
      SELECT ps.product_id, ps.shop_id, ps.platform, ps.sale_date, ps.quantity_sold,
             ps.unit_price, ps.total_sales, ps.order_id
      FROM product_sales ps
      JOIN shops s ON ps.shop_id = s.shop_id
      WHERE ps.account_id = $1 AND s.platform = $2
    `, [businessAccount.account_id, platform]);
    
    for (const sale of businessSales) {
      // Get the corresponding product and shop IDs for OAuth user
      const oauthProduct = await queryOne<{ product_id: number }>(`
        SELECT p.product_id FROM products p
        WHERE p.account_id = $1 AND p.sku = (
          SELECT sku FROM products WHERE product_id = $2
        )
      `, [oauthAccount.account_id, sale.product_id]);
      
      const oauthShop = await queryOne<{ shop_id: number }>(`
        SELECT s.shop_id FROM shops s
        WHERE s.account_id = $1 AND s.platform = $2 AND s.platform_shop_id = (
          SELECT platform_shop_id FROM shops WHERE shop_id = $3
        )
      `, [oauthAccount.account_id, sale.platform, sale.shop_id]);
      
      if (oauthProduct && oauthShop) {
        // Check if sale already exists
        const existingSale = await queryOne<{ sale_id: number }>(`
          SELECT sale_id FROM product_sales 
          WHERE account_id = $1 AND order_id = $2
        `, [oauthAccount.account_id, sale.order_id]);
        
        if (!existingSale) {
          // Copy sale to OAuth user's account
          await query(`
            INSERT INTO product_sales (account_id, product_id, shop_id, platform, sale_date,
                                     quantity_sold, unit_price, total_sales, order_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            oauthAccount.account_id, oauthProduct.product_id, oauthShop.shop_id,
            sale.platform, sale.sale_date, sale.quantity_sold, sale.unit_price,
            sale.total_sales, sale.order_id
          ]);
        }
      }
    }
    
    // Update daily sales aggregated for OAuth user
    await query(`
      INSERT INTO daily_sales_aggregated (account_id, sale_date, total_sales, total_orders, platform_breakdown)
      SELECT 
        $1 as account_id,
        sale_date,
        SUM(platform_total) as total_sales,
        COUNT(DISTINCT order_id) as total_orders,
        jsonb_object_agg(platform, platform_total::text)
      FROM (
        SELECT 
          sale_date,
          platform,
          SUM(total_sales) as platform_total,
          order_id
        FROM product_sales
        WHERE account_id = $1
        GROUP BY sale_date, platform, order_id
      ) platform_sales
      GROUP BY sale_date
      ON CONFLICT (account_id, sale_date) DO UPDATE SET
        total_sales = EXCLUDED.total_sales,
        total_orders = EXCLUDED.total_orders,
        platform_breakdown = EXCLUDED.platform_breakdown,
        updated_at = CURRENT_TIMESTAMP
    `, [oauthAccount.account_id]);
    
    console.log(`✅ Successfully linked OAuth user ${userId} to demo data from ${businessOwnerEmail} on ${platform}`);
    
    return {
      success: true,
      message: `Successfully linked ${platform} integration to demo data`,
      platform: platform,
      businessOwner: businessOwnerEmail,
      accountId: oauthAccount.account_id
    };
  } catch (error) {
    console.error('Error linking OAuth to demo data:', error);
    return {
      success: false,
      error: 'Failed to link OAuth integration to demo data'
    };
  }
}
