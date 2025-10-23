import { NextResponse } from 'next/server';
import { BusinessDataService } from '../../../services/businessDataService';
import { EnhancedDataSanitizationService } from '../../../services/enhancedDataSanitizationService';
import { ForecastingService } from '../../../services/forecastingService';

interface GeneratedInsight {
  id: string;
  type: 'promotion' | 'inventory' | 'marketing' | 'trend' | 'feedback' | 'forecast';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  suggestedAction: string;
  timeline: string;
  supportingData: string;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'AI Insights feature is not configured. Please add GOOGLE_API_KEY environment variable to enable this feature.' 
      }, { status: 503 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Fetch user's business data
    let userBusinessData;
    let sanitizedData;
    let salesPerformance;
    let inventoryInsights;
    let shopPerformance;
    let salesForecast;
    let inventoryForecast;
    try {
      // Auto-sync sales data to ensure accuracy
      await BusinessDataService.syncProductSalesData(userId);
      userBusinessData = await BusinessDataService.getUserBusinessData(userId);
      
      // Also get additional insights
      salesPerformance = await BusinessDataService.getSalesPerformance(userId, 30);
      inventoryInsights = await BusinessDataService.getInventoryInsights(userId);
      shopPerformance = await BusinessDataService.getShopPerformance(userId);
      
      // Get forecasting data
      salesForecast = await ForecastingService.forecastSales(userId);
      inventoryForecast = await ForecastingService.forecastInventory(userId);
      
      // Sanitize data before sending to AI (only sanitize the base business data)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sanitizedData = EnhancedDataSanitizationService.sanitizeForAI(userBusinessData as any);
      
      // Log data access for audit
      EnhancedDataSanitizationService.logDataAccess(userId, 'business_insights_generation', true);
    } catch (error) {
      console.error('Error fetching user business data:', error);
      return NextResponse.json({ error: 'Failed to fetch business data' }, { status: 500 });
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const genAIModel = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 4096, // Increased to support more insights
      }
    });

    // Combine all data for AI analysis
    const completeDataForAI = {
      businessData: sanitizedData,
      salesPerformance,
      inventoryInsights,
      shopPerformance,
      salesForecast,
      inventoryForecast
    };

    const businessDataText = `BUSINESS DATA (sanitized for analysis):
${JSON.stringify(completeDataForAI, null, 2)}

This data includes:
- Recent sales data (last 30 days)
- Product inventory levels and performance
- Top-selling products
- Shop performance metrics
- Sales trends and patterns
- Sales performance summary
- Inventory status summary
- SALES FORECASTING: Next week and next month predictions with confidence levels
- INVENTORY FORECASTING: Products needing restock, overstocked items, and timelines

All monetary values are in Philippine Peso (PHP) - use ₱ symbol.`;

    const prompt = `You are DataDrip's AI business analyst. Analyze the user's actual business data and generate 8-10 actionable business insights including forecasting insights.

${businessDataText}

Generate 8-10 insights (or more if data is rich) in the following JSON format. Each insight must be based on the ACTUAL DATA provided above:

{
  "insights": [
    {
      "type": "promotion" or "inventory" or "trend" or "feedback" or "forecast",
      "title": "Short, compelling title (max 50 chars)",
      "description": "Brief explanation based on actual data (max 120 chars)",
      "confidence": number between 70-95,
      "priority": "high" or "medium" or "low",
      "suggestedAction": "Specific actionable step (max 60 chars)",
      "timeline": "When to act (e.g., 'Next 2 weeks', 'Immediate')",
      "supportingData": "Specific numbers from data (max 70 chars)"
    }
  ]
}

RULES:
1. Generate 8-10 diverse insights covering: promotion, inventory, trend, feedback, AND forecast types
2. At least TWO insights MUST be type "forecast" using the salesForecast or inventoryForecast data
3. Use REAL numbers from the provided data including forecast predictions
4. Generate MULTIPLE inventory insights if there are multiple products with issues (low stock, overstock, etc.)
5. Generate MULTIPLE promotion insights for different top products or categories
6. Create specific insights for each shop if there are multiple shops
7. For forecast insights, use the predicted revenue, orders, and stock-out timelines
8. If inventoryForecast shows products needing restock, create separate insights for urgent vs. normal restocks
9. If salesForecast shows increasing/decreasing trends, mention the predicted revenue
10. If data shows low stock products, create individual insights with actual product names
11. If data shows sales trends, create a trend insight with real percentages
12. Analyze day-of-week patterns and create insights about best sales days
13. For promotion insights, base it on actual sales patterns, top products, or seasonal data
14. For feedback insights, base it on shop ratings or performance metrics
15. Priority should be: high (urgent/critical), medium (important), low (nice to have)
16. Confidence should reflect data quality and forecast confidence levels
17. Always use PHP currency symbol (₱) for monetary values
18. Be specific with numbers - reference actual products, sales figures, stock levels, and predictions
19. Don't hold back - generate as many actionable insights as the data supports!

Return ONLY valid JSON, no markdown formatting or code blocks.`;

    const result = await genAIModel.generateContent(prompt);
    const text = result.response.text();
    
    // Clean up the response - remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Parse the JSON response
    let parsedInsights;
    try {
      parsedInsights = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanedText, parseError);
      // Return fallback insights based on actual data
      return NextResponse.json({ 
        insights: generateFallbackInsights(userBusinessData)
      });
    }

    // Validate and add IDs to insights (remove existing id if present to avoid conflict)
    const validatedInsights = parsedInsights.insights.map((insight: GeneratedInsight, index: number) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...insightWithoutId } = insight;
      return {
        ...insightWithoutId,
        id: `${Date.now()}-${index}`
      };
    });

    return NextResponse.json({ insights: validatedInsights });
  } catch (err: unknown) {
    console.error('Business insights generation error:', err);
    return NextResponse.json({ error: 'Failed to generate business insights' }, { status: 500 });
  }
}

// Fallback insights generator using actual data (no AI)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateFallbackInsights(businessData: any): GeneratedInsight[] {
  const insights: GeneratedInsight[] = [];
  const timestamp = Date.now();

  // Inventory insight based on actual data
  if (businessData.topProducts && businessData.topProducts.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lowStockProducts = businessData.topProducts.filter((p: any) => p.stock < 20);
    if (lowStockProducts.length > 0) {
      insights.push({
        id: `${timestamp}-1`,
        type: 'inventory',
        title: 'Low Stock Alert for Top Products',
        description: `${lowStockProducts.length} best-selling items are running low. Restock to avoid losing sales.`,
        confidence: 90,
        priority: 'high',
        suggestedAction: `Restock ${lowStockProducts.length} critical products`,
        timeline: 'Immediate',
        supportingData: `${lowStockProducts.length} products below 20 units`
      });
    }
  }

  // Sales trend insight
  if (businessData.recentSales && businessData.recentSales.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalRevenue = businessData.recentSales.reduce((sum: number, day: any) => sum + parseFloat(day.daily_revenue || 0), 0);
    insights.push({
      id: `${timestamp}-2`,
      type: 'trend',
      title: 'Sales Performance Analysis',
      description: `Recent sales data shows ₱${totalRevenue.toFixed(2)} in the last 30 days.`,
      confidence: 85,
      priority: 'medium',
      suggestedAction: 'Review top-performing days and replicate success',
      timeline: 'Next week',
      supportingData: `₱${totalRevenue.toFixed(2)} total revenue`
    });
  }

  // Product performance insight
  if (businessData.topProducts && businessData.topProducts.length > 0) {
    const topProduct = businessData.topProducts[0];
    insights.push({
      id: `${timestamp}-3`,
      type: 'promotion',
      title: 'Top Product Promotion Opportunity',
      description: `${topProduct.name} is your best seller with ₱${topProduct.actual_sales_revenue} revenue.`,
      confidence: 88,
      priority: 'medium',
      suggestedAction: 'Create bundle deals with this product',
      timeline: 'Next 2 weeks',
      supportingData: `${topProduct.actual_sales_count} units sold`
    });
  }

  // Shop performance insight
  if (businessData.shops && businessData.shops.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const avgRating = businessData.shops.reduce((sum: number, shop: any) => sum + (shop.rating_value || 0), 0) / businessData.shops.length;
    insights.push({
      id: `${timestamp}-4`,
      type: 'feedback',
      title: 'Shop Performance Review',
      description: `Your shops maintain an average ${avgRating.toFixed(1)}/5 rating across platforms.`,
      confidence: 82,
      priority: avgRating >= 4.5 ? 'low' : 'medium',
      suggestedAction: avgRating >= 4.5 ? 'Maintain excellent service' : 'Focus on customer satisfaction',
      timeline: 'Ongoing',
      supportingData: `${avgRating.toFixed(1)}/5 average rating`
    });
  }

  return insights;
}

