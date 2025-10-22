/**
 * Enhanced Data Sanitization Service
 * Maintains accuracy while protecting sensitive information
 */

export interface EnhancedSanitizedBusinessData {
  summary: {
    totalProducts: number;
    totalShops: number;
    totalAccounts: number;
    totalRevenue: number;
    totalSales: number;
    avgDailyRevenue: number;
  };
  topProducts: Array<{
    name: string;
    revenue: number;
    quantity: number;
    category: string;
    stockLevel: 'high' | 'medium' | 'low' | 'out';
    performance: 'excellent' | 'good' | 'average' | 'poor';
  }>;
  recentSales: Array<{
    date: string;
    revenue: number;
    quantity: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  shopPerformance: Array<{
    platform: string;
    followers: number;
    rating: number;
    performance: 'excellent' | 'good' | 'average' | 'poor';
  }>;
  inventoryInsights: {
    totalProducts: number;
    outOfStock: number;
    lowStock: number;
    overstocked: number;
    avgStockLevel: number;
  };
  businessMetrics: {
    revenueGrowth: number;
    topCategory: string;
    bestPlatform: string;
    inventoryHealth: 'excellent' | 'good' | 'needs_attention' | 'critical';
  };
}

export class EnhancedDataSanitizationService {
  /**
   * Enhanced sanitization that maintains accuracy while protecting sensitive data
   */
  static sanitizeForAI(rawData: any): EnhancedSanitizedBusinessData {
    try {
      // Calculate summary metrics with minimal rounding
      const totalRevenue = rawData.products?.reduce((sum: number, p: any) => 
        sum + (p.actual_sales_revenue || 0), 0) || 0;
      const totalSales = rawData.products?.reduce((sum: number, p: any) => 
        sum + (p.actual_sales_count || 0), 0) || 0;
      const avgDailyRevenue = rawData.recentSales?.length > 0 
        ? rawData.recentSales.reduce((sum: number, s: any) => sum + s.daily_revenue, 0) / rawData.recentSales.length
        : 0;

      // Enhanced top products with performance indicators
      const topProducts = (rawData.products || [])
        .slice(0, 5)
        .map((p: any, index: number) => ({
          name: p.name || 'Unknown Product',
          revenue: Math.round(p.actual_sales_revenue || 0), // Keep exact revenue
          quantity: Math.round(p.actual_sales_count || 0), // Keep exact quantity
          category: p.category || 'General',
          stockLevel: this.getStockLevel(p.stock || 0),
          performance: this.getPerformanceLevel(p.actual_sales_revenue || 0, index)
        }));

      // Enhanced recent sales with trend analysis
      const recentSales = (rawData.recentSales || [])
        .slice(0, 7)
        .map((s: any, index: number, array: any[]) => {
          const prevRevenue = index < array.length - 1 ? array[index + 1]?.daily_revenue || 0 : 0;
          const currentRevenue = s.daily_revenue || 0;
          const trend = this.calculateTrend(prevRevenue, currentRevenue);
          
          return {
            date: s.sale_date || '',
            revenue: Math.round(currentRevenue), // Keep exact revenue
            quantity: Math.round(s.daily_quantity || 0), // Keep exact quantity
            trend
          };
        });

      // Enhanced shop performance with performance indicators
      const shopPerformance = (rawData.shops || [])
        .map((s: any) => ({
          platform: s.platform || 'Unknown',
          followers: Math.round(s.followers_count || 0), // Keep exact follower count
          rating: Math.round((s.rating_value || 0) * 10) / 10, // Round to 1 decimal
          performance: this.getShopPerformanceLevel(s.followers_count || 0, s.rating_value || 0)
        }));

      // Enhanced inventory insights
      const products = rawData.products || [];
      const inventoryInsights = {
        totalProducts: products.length,
        outOfStock: products.filter((p: any) => (p.stock || 0) === 0).length,
        lowStock: products.filter((p: any) => (p.stock || 0) < 10).length,
        overstocked: products.filter((p: any) => (p.stock || 0) > 100).length,
        avgStockLevel: products.length > 0 ? Math.round(products.reduce((sum: number, p: any) => sum + (p.stock || 0), 0) / products.length) : 0
      };

      // Business metrics for better insights
      const businessMetrics = {
        revenueGrowth: this.calculateRevenueGrowth(rawData.recentSales || []),
        topCategory: this.getTopCategory(products),
        bestPlatform: this.getBestPlatform(shopPerformance),
        inventoryHealth: this.getInventoryHealth(inventoryInsights)
      };

      return {
        summary: {
          totalProducts: rawData.totalProducts || 0,
          totalShops: rawData.totalShops || 0,
          totalAccounts: rawData.totalAccounts || 0,
          totalRevenue: Math.round(totalRevenue), // Keep exact total
          totalSales: Math.round(totalSales), // Keep exact total
          avgDailyRevenue: Math.round(avgDailyRevenue) // Keep exact average
        },
        topProducts,
        recentSales,
        shopPerformance,
        inventoryInsights,
        businessMetrics
      };
    } catch (error) {
      console.error('Error in enhanced sanitization:', error);
      return this.getDefaultSanitizedData();
    }
  }

  /**
   * Get stock level category
   */
  private static getStockLevel(stock: number): 'high' | 'medium' | 'low' | 'out' {
    if (stock === 0) return 'out';
    if (stock < 10) return 'low';
    if (stock < 50) return 'medium';
    return 'high';
  }

  /**
   * Get performance level based on revenue and ranking
   */
  private static getPerformanceLevel(revenue: number, index: number): 'excellent' | 'good' | 'average' | 'poor' {
    if (index === 0 && revenue > 3000000) return 'excellent';
    if (index < 2 && revenue > 1500000) return 'good';
    if (index < 4 && revenue > 500000) return 'average';
    return 'poor';
  }

  /**
   * Calculate trend between two values
   */
  private static calculateTrend(prev: number, current: number): 'up' | 'down' | 'stable' {
    if (current > prev * 1.1) return 'up';
    if (current < prev * 0.9) return 'down';
    return 'stable';
  }

  /**
   * Get shop performance level
   */
  private static getShopPerformanceLevel(followers: number, rating: number): 'excellent' | 'good' | 'average' | 'poor' {
    if (followers > 10000 && rating > 4.5) return 'excellent';
    if (followers > 5000 && rating > 4.0) return 'good';
    if (followers > 1000 && rating > 3.5) return 'average';
    return 'poor';
  }

  /**
   * Calculate revenue growth percentage
   */
  private static calculateRevenueGrowth(recentSales: any[]): number {
    if (recentSales.length < 2) return 0;
    const latest = recentSales[0]?.daily_revenue || 0;
    const previous = recentSales[1]?.daily_revenue || 0;
    if (previous === 0) return 0;
    return Math.round(((latest - previous) / previous) * 100);
  }

  /**
   * Get top category by product count
   */
  private static getTopCategory(products: any[]): string {
    const categories = products.reduce((acc: any, p: any) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b, 'General');
  }

  /**
   * Get best performing platform
   */
  private static getBestPlatform(shopPerformance: any[]): string {
    return shopPerformance.reduce((best, shop) => 
      shop.followers > best.followers ? shop : best, shopPerformance[0] || { platform: 'Unknown' }
    ).platform;
  }

  /**
   * Get inventory health status
   */
  private static getInventoryHealth(insights: any): 'excellent' | 'good' | 'needs_attention' | 'critical' {
    const { outOfStock, lowStock, totalProducts } = insights;
    const outOfStockPercent = (outOfStock / totalProducts) * 100;
    const lowStockPercent = (lowStock / totalProducts) * 100;
    
    if (outOfStockPercent > 20 || lowStockPercent > 50) return 'critical';
    if (outOfStockPercent > 10 || lowStockPercent > 30) return 'needs_attention';
    if (outOfStockPercent > 5 || lowStockPercent > 20) return 'good';
    return 'excellent';
  }

  /**
   * Get default sanitized data when error occurs
   */
  private static getDefaultSanitizedData(): EnhancedSanitizedBusinessData {
    return {
      summary: {
        totalProducts: 0,
        totalShops: 0,
        totalAccounts: 0,
        totalRevenue: 0,
        totalSales: 0,
        avgDailyRevenue: 0
      },
      topProducts: [],
      recentSales: [],
      shopPerformance: [],
      inventoryInsights: {
        totalProducts: 0,
        outOfStock: 0,
        lowStock: 0,
        overstocked: 0,
        avgStockLevel: 0
      },
      businessMetrics: {
        revenueGrowth: 0,
        topCategory: 'General',
        bestPlatform: 'Unknown',
        inventoryHealth: 'excellent'
      }
    };
  }

  /**
   * Log data access for audit purposes
   */
  static logDataAccess(userId: number, dataType: string, sanitized: boolean = true) {
    const { AuditLogService } = require('./auditLogService');
    AuditLogService.logDataAccess(userId, dataType, sanitized);
  }
}
