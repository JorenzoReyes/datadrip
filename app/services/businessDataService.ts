import { query } from '../utils/database';

export interface BusinessData {
  accounts: Array<{
    account_id: number;
    name: string;
    status: string;
    created_at: string;
  }>;
  shops: Array<{
    shop_id: number;
    account_id: number;
    name: string;
    platform: string;
    platform_shop_id: string;
    followers_count: number;
    products_count: number;
    rating_value: number;
    rating_count: number;
    chat_performance_percent: number;
    joined_at: string;
    account_name: string;
  }>;
  products: Array<{
    product_id: number;
    name: string;
    sku: string | null;
    brand: string | null;
    category: string | null;
    subcategory: string | null;
    price: number;
    stock: number;
    status: string;
    sales_count: number;
    sales_revenue: number;
    actual_sales_revenue: number;
    actual_sales_count: number;
    total_sales_transactions: number;
  }>;
  recentSales: Array<{
    sale_date: string;
    daily_revenue: number;
    daily_quantity: number;
    daily_orders: number;
  }>;
  topProducts: Array<{
    name: string;
    stock: number;
    price: number;
    category: string | null;
    actual_sales_count: number;
    actual_sales_revenue: number;
    total_transactions: number;
  }>;
  totalProducts: number;
  totalShops: number;
  totalAccounts: number;
}

export class BusinessDataService {
  /**
   * Fetch comprehensive business data for a user
   */
  static async getUserBusinessData(userId: number): Promise<BusinessData> {
    try {
      // Get user's accounts (limited columns for security)
      const accounts = await query(
        'SELECT account_id, name, status, created_at FROM accounts WHERE owner_user_id = $1',
        [userId]
      );

      // Get user's shops with account names (limited columns for security)
      const shops = await query(
        `SELECT s.shop_id, s.account_id, s.name, s.platform, s.platform_shop_id, 
                s.followers_count, s.products_count, s.rating_value, s.rating_count, 
                s.chat_performance_percent, s.joined_at, a.name as account_name 
         FROM shops s 
         JOIN accounts a ON s.account_id = a.account_id 
         WHERE a.owner_user_id = $1`,
        [userId]
      );

      // Get user's products with real-time sales data (limited columns for security)
      const products = await query(
        `SELECT 
          p.product_id, p.name, p.sku, p.brand, p.category, p.subcategory, 
          p.price, p.stock, p.status, p.sales_count, p.sales_revenue,
          COALESCE(SUM(ps.total_sales), 0) as actual_sales_revenue,
          COALESCE(SUM(ps.quantity_sold), 0) as actual_sales_count,
          COALESCE(COUNT(ps.sale_id), 0) as total_sales_transactions
         FROM products p
         LEFT JOIN product_sales ps ON p.product_id = ps.product_id
         WHERE p.owner_user_id = $1
         GROUP BY p.product_id, p.name, p.sku, p.brand, p.category, p.subcategory, 
                  p.price, p.stock, p.status, p.sales_count, p.sales_revenue
         ORDER BY actual_sales_revenue DESC
         LIMIT 20`,
        [userId]
      );

      // Get recent sales data (last 30 days)
      const recentSales = await query(
        `SELECT 
          DATE(sale_date) as sale_date,
          SUM(total_sales) as daily_revenue,
          SUM(quantity_sold) as daily_quantity,
          COUNT(DISTINCT order_id) as daily_orders
         FROM product_sales ps
         JOIN products p ON ps.product_id = p.product_id
         WHERE p.owner_user_id = $1 
         AND ps.sale_date >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY DATE(sale_date)
         ORDER BY sale_date DESC`,
        [userId]
      );

      // Get top selling products with real-time sales data (limited columns for security)
      const topProducts = await query(
        `SELECT 
          p.name,
          p.stock,
          p.price,
          p.category,
          COALESCE(SUM(ps.quantity_sold), 0) as actual_sales_count,
          COALESCE(SUM(ps.total_sales), 0) as actual_sales_revenue,
          COALESCE(COUNT(ps.sale_id), 0) as total_transactions
         FROM products p
         LEFT JOIN product_sales ps ON p.product_id = ps.product_id
         WHERE p.owner_user_id = $1
         GROUP BY p.product_id, p.name, p.stock, p.price, p.category
         ORDER BY actual_sales_revenue DESC
         LIMIT 10`,
        [userId]
      );

      return {
        accounts: accounts as BusinessData['accounts'],
        shops: shops as BusinessData['shops'],
        products: products as BusinessData['products'],
        recentSales: recentSales as BusinessData['recentSales'],
        topProducts: topProducts as BusinessData['topProducts'],
        totalProducts: products.length,
        totalShops: shops.length,
        totalAccounts: accounts.length
      };
    } catch (error) {
      console.error('Error fetching user business data:', error);
      throw new Error('Failed to fetch business data');
    }
  }

  /**
   * Get sales performance summary for a user
   */
  static async getSalesPerformance(userId: number, days: number = 30) {
    try {
      const salesData = await query(
        `SELECT 
          SUM(total_sales) as total_revenue,
          SUM(quantity_sold) as total_quantity,
          COUNT(DISTINCT order_id) as total_orders,
          AVG(total_sales) as avg_order_value
         FROM product_sales ps
         JOIN products p ON ps.product_id = p.product_id
         WHERE p.owner_user_id = $1 
         AND ps.sale_date >= CURRENT_DATE - INTERVAL '${days} days'`,
        [userId]
      );

      return salesData[0] || {
        total_revenue: 0,
        total_quantity: 0,
        total_orders: 0,
        avg_order_value: 0
      };
    } catch (error) {
      console.error('Error fetching sales performance:', error);
      throw new Error('Failed to fetch sales performance');
    }
  }

  /**
   * Get inventory insights for a user
   */
  static async getInventoryInsights(userId: number) {
    try {
      const inventoryData = await query(
        `SELECT 
          COUNT(*) as total_products,
          SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
          SUM(CASE WHEN stock < 10 THEN 1 ELSE 0 END) as low_stock,
          SUM(CASE WHEN stock > 100 THEN 1 ELSE 0 END) as overstocked,
          AVG(stock) as avg_stock_level
         FROM products 
         WHERE owner_user_id = $1 AND status = 'active'`,
        [userId]
      );

      return inventoryData[0] || {
        total_products: 0,
        out_of_stock: 0,
        low_stock: 0,
        overstocked: 0,
        avg_stock_level: 0
      };
    } catch (error) {
      console.error('Error fetching inventory insights:', error);
      throw new Error('Failed to fetch inventory insights');
    }
  }

  /**
   * Get shop performance metrics
   */
  static async getShopPerformance(userId: number) {
    try {
      const shopData = await query(
        `SELECT 
          s.name,
          s.platform,
          s.products_count,
          s.followers_count,
          s.rating_value,
          s.rating_count,
          COALESCE(SUM(ps.total_sales), 0) as total_revenue
         FROM shops s
         LEFT JOIN product_sales ps ON s.shop_id = ps.shop_id
         JOIN accounts a ON s.account_id = a.account_id
         WHERE a.owner_user_id = $1
         GROUP BY s.shop_id, s.name, s.platform, s.products_count, s.followers_count, s.rating_value, s.rating_count
         ORDER BY total_revenue DESC`,
        [userId]
      );

      return shopData;
    } catch (error) {
      console.error('Error fetching shop performance:', error);
      throw new Error('Failed to fetch shop performance');
    }
  }

  /**
   * Sync products table with real sales data
   * This updates the sales_count and sales_revenue columns in products table
   */
  static async syncProductSalesData(userId: number) {
    try {
      await query(
        `UPDATE products 
         SET 
           sales_count = COALESCE((
             SELECT SUM(quantity_sold) 
             FROM product_sales ps 
             WHERE ps.product_id = products.product_id
           ), 0),
           sales_revenue = COALESCE((
             SELECT SUM(total_sales) 
             FROM product_sales ps 
             WHERE ps.product_id = products.product_id
           ), 0)
         WHERE owner_user_id = $1`,
        [userId]
      );

      return { success: true, message: 'Product sales data synced successfully' };
    } catch (error) {
      console.error('Error syncing product sales data:', error);
      throw new Error('Failed to sync product sales data');
    }
  }
}
