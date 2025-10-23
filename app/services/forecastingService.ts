import { query } from '../utils/database';

export interface SalesForecast {
  nextWeek: {
    predictedRevenue: number;
    predictedOrders: number;
    confidence: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  nextMonth: {
    predictedRevenue: number;
    predictedOrders: number;
    confidence: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  insights: string[];
}

export interface InventoryForecast {
  productsNeedingRestock: Array<{
    product_id: number;
    name: string;
    currentStock: number;
    estimatedDaysUntilStockout: number;
    recommendedRestockQuantity: number;
    dailySalesRate: number;
  }>;
  overstockedProducts: Array<{
    product_id: number;
    name: string;
    currentStock: number;
    dailySalesRate: number;
    estimatedDaysOfStock: number;
  }>;
  insights: string[];
}

export class ForecastingService {
  /**
   * Forecast future sales based on historical data
   * Uses simple moving average and trend analysis
   */
  static async forecastSales(userId: number): Promise<SalesForecast> {
    try {
      // Get sales data for the last 60 days for better forecasting
      const salesData = await query(
        `SELECT 
          DATE(sale_date) as sale_date,
          SUM(total_sales) as daily_revenue,
          SUM(quantity_sold) as daily_quantity,
          COUNT(DISTINCT order_id) as daily_orders
         FROM product_sales ps
         JOIN products p ON ps.product_id = p.product_id
         WHERE p.owner_user_id = $1 
         AND ps.sale_date >= CURRENT_DATE - INTERVAL '60 days'
         GROUP BY DATE(sale_date)
         ORDER BY sale_date DESC`,
        [userId]
      );

      if (!salesData || salesData.length < 7) {
        // Not enough data for forecasting
        return {
          nextWeek: {
            predictedRevenue: 0,
            predictedOrders: 0,
            confidence: 0,
            trend: 'stable'
          },
          nextMonth: {
            predictedRevenue: 0,
            predictedOrders: 0,
            confidence: 0,
            trend: 'stable'
          },
          insights: ['Not enough historical data for accurate forecasting. Continue collecting sales data.']
        };
      }

      // Calculate moving averages
      const last7Days = salesData.slice(0, 7);
      const last14Days = salesData.slice(0, 14);
      const last30Days = salesData.slice(0, 30);

      const avg7DaysRevenue = last7Days.reduce((sum, day) => sum + (parseFloat(String(day.daily_revenue)) || 0), 0) / 7;
      const avg7DaysOrders = last7Days.reduce((sum, day) => sum + (parseInt(String(day.daily_orders)) || 0), 0) / 7;

      const avg14DaysRevenue = last14Days.reduce((sum, day) => sum + (parseFloat(String(day.daily_revenue)) || 0), 0) / 14;
      const avg30DaysRevenue = last30Days.reduce((sum, day) => sum + (parseFloat(String(day.daily_revenue)) || 0), 0) / 30;
      const avg30DaysOrders = last30Days.reduce((sum, day) => sum + (parseInt(String(day.daily_orders)) || 0), 0) / 30;

      // Calculate trend
      const trendSlope = (avg7DaysRevenue - avg30DaysRevenue) / avg30DaysRevenue;
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (trendSlope > 0.1) trend = 'increasing';
      else if (trendSlope < -0.1) trend = 'decreasing';

      // Apply trend factor for forecasting
      const trendFactor = 1 + (trendSlope * 0.5); // Moderate the trend impact

      // Next week prediction (7 days)
      const nextWeekRevenue = avg7DaysRevenue * 7 * trendFactor;
      const nextWeekOrders = Math.round(avg7DaysOrders * 7 * trendFactor);

      // Next month prediction (30 days)
      const nextMonthRevenue = avg14DaysRevenue * 30 * trendFactor;
      const nextMonthOrders = Math.round(avg30DaysOrders * 30 * trendFactor);

      // Calculate confidence based on data consistency
      const revenueStdDev = this.calculateStandardDeviation(last30Days.map(d => (parseFloat(String(d.daily_revenue)) || 0)));
      const coefficientOfVariation = revenueStdDev / avg30DaysRevenue;
      const confidence = Math.max(50, Math.min(95, 100 - (coefficientOfVariation * 100)));

      // Generate insights
      const insights: string[] = [];
      
      if (trend === 'increasing') {
        const growthRate = (trendSlope * 100).toFixed(1);
        insights.push(`Sales are trending upward with ${growthRate}% growth. Consider increasing inventory.`);
      } else if (trend === 'decreasing') {
        const declineRate = (Math.abs(trendSlope) * 100).toFixed(1);
        insights.push(`Sales are declining by ${declineRate}%. Review marketing strategy and product offerings.`);
      } else {
        insights.push('Sales are stable. Focus on maintaining current performance.');
      }

      if (confidence < 70) {
        insights.push('Sales are volatile. Predictions have lower confidence. Consider promotional campaigns to stabilize.');
      }

      // Day of week analysis
      const dayOfWeekRevenue: { [key: number]: number[] } = {};
      salesData.forEach(day => {
        const date = new Date(String(day.sale_date));
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        if (!dayOfWeekRevenue[dayOfWeek]) dayOfWeekRevenue[dayOfWeek] = [];
        dayOfWeekRevenue[dayOfWeek].push(parseFloat(String(day.daily_revenue)) || 0);
      });

      const avgByDay = Object.keys(dayOfWeekRevenue).map(day => ({
        day: parseInt(day),
        avg: dayOfWeekRevenue[parseInt(day)].reduce((a, b) => a + b, 0) / dayOfWeekRevenue[parseInt(day)].length
      }));

      if (avgByDay.length >= 7) {
        const bestDay = avgByDay.reduce((max, d) => d.avg > max.avg ? d : max);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        insights.push(`${dayNames[bestDay.day]} is your best sales day. Plan promotions accordingly.`);
      }

      return {
        nextWeek: {
          predictedRevenue: nextWeekRevenue,
          predictedOrders: nextWeekOrders,
          confidence: Math.round(confidence),
          trend
        },
        nextMonth: {
          predictedRevenue: nextMonthRevenue,
          predictedOrders: nextMonthOrders,
          confidence: Math.round(confidence * 0.9), // Slightly lower confidence for longer term
          trend
        },
        insights
      };
    } catch (error) {
      console.error('Error forecasting sales:', error);
      throw new Error('Failed to forecast sales');
    }
  }

  /**
   * Forecast inventory needs based on sales velocity
   */
  static async forecastInventory(userId: number): Promise<InventoryForecast> {
    try {
      // Get products with their sales velocity
      const productsWithVelocity = await query(
        `SELECT 
          p.product_id,
          p.name,
          p.stock as current_stock,
          COALESCE(SUM(ps.quantity_sold), 0) as total_sold_30d,
          COALESCE(SUM(ps.quantity_sold), 0) / 30.0 as daily_sales_rate
         FROM products p
         LEFT JOIN product_sales ps ON p.product_id = ps.product_id 
           AND ps.sale_date >= CURRENT_DATE - INTERVAL '30 days'
         WHERE p.owner_user_id = $1 
         AND p.status = 'active'
         GROUP BY p.product_id, p.name, p.stock
         HAVING p.stock > 0 OR COALESCE(SUM(ps.quantity_sold), 0) > 0
         ORDER BY daily_sales_rate DESC`,
        [userId]
      );

      const productsNeedingRestock: InventoryForecast['productsNeedingRestock'] = [];
      const overstockedProducts: InventoryForecast['overstockedProducts'] = [];
      const insights: string[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      productsWithVelocity.forEach((product: any) => {
        const currentStock = parseInt(String(product.current_stock)) || 0;
        const dailySalesRate = parseFloat(String(product.daily_sales_rate)) || 0;

        // Skip products with no sales
        if (dailySalesRate === 0) return;

        const daysUntilStockout = dailySalesRate > 0 ? currentStock / dailySalesRate : 999;
        const daysOfStock = daysUntilStockout;

        // Products needing restock (less than 14 days of stock)
        if (daysUntilStockout < 14 && currentStock < 50) {
          const recommendedRestock = Math.ceil(dailySalesRate * 30); // 30 days worth
          productsNeedingRestock.push({
            product_id: product.product_id,
            name: product.name,
            currentStock,
            estimatedDaysUntilStockout: Math.round(daysUntilStockout),
            recommendedRestockQuantity: recommendedRestock,
            dailySalesRate: parseFloat(dailySalesRate.toFixed(2))
          });
        }

        // Overstocked products (more than 90 days of stock and high stock count)
        if (daysOfStock > 90 && currentStock > 100) {
          overstockedProducts.push({
            product_id: product.product_id,
            name: product.name,
            currentStock,
            dailySalesRate: parseFloat(dailySalesRate.toFixed(2)),
            estimatedDaysOfStock: Math.round(daysOfStock)
          });
        }
      });

      // Generate insights
      if (productsNeedingRestock.length > 0) {
        const urgentCount = productsNeedingRestock.filter(p => p.estimatedDaysUntilStockout < 7).length;
        if (urgentCount > 0) {
          insights.push(`URGENT: ${urgentCount} products will run out within a week. Immediate restocking required.`);
        }
        insights.push(`${productsNeedingRestock.length} products need restocking within the next 2 weeks.`);
      } else {
        insights.push('Inventory levels are healthy for the next 2 weeks.');
      }

      if (overstockedProducts.length > 0) {
        insights.push(`${overstockedProducts.length} products are overstocked. Consider promotions to move inventory.`);
      }

      // Calculate total value at risk
      const totalRestockValue = productsNeedingRestock.reduce((sum, p) => sum + p.recommendedRestockQuantity, 0);
      if (totalRestockValue > 0) {
        insights.push(`Recommended total restock quantity: ${totalRestockValue} units across all products.`);
      }

      return {
        productsNeedingRestock,
        overstockedProducts,
        insights
      };
    } catch (error) {
      console.error('Error forecasting inventory:', error);
      throw new Error('Failed to forecast inventory');
    }
  }

  /**
   * Calculate standard deviation for confidence scoring
   */
  private static calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }
}

