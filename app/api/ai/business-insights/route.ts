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

/**
 * Formats currency values by adding comma thousand separators
 * Handles both ₱ and $ symbols (converts $ to ₱)
 * Examples: ₱6772393.71 → ₱6,772,393.71 | ₱45678 → ₱45,678
 */
function formatCurrency(text: string): string {
  // Replace $ with ₱ for consistency
  text = text.replace(/\$(\d)/g, '₱$1');
  
  // Find all currency values (₱ followed by digits, possibly with decimals)
  return text.replace(/₱(\d+(?:\.\d+)?)/g, (match, number) => {
    const parts = number.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Add comma separators to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Return with decimal part if it exists
    return decimalPart ? `₱${formattedInteger}.${decimalPart}` : `₱${formattedInteger}`;
  });
}

/**
 * Applies currency formatting to all text fields in an insight
 */
function formatInsightCurrency(insight: GeneratedInsight): GeneratedInsight {
  return {
    ...insight,
    title: formatCurrency(insight.title),
    description: formatCurrency(insight.description),
    suggestedAction: formatCurrency(insight.suggestedAction),
    supportingData: formatCurrency(insight.supportingData)
  };
}

/**
 * Validates that an insight meets SMART criteria (filters out vague insights)
 * Returns true if insight is SMART, false if it's too vague
 */
function isSmartInsight(insight: GeneratedInsight): boolean {
  const vaguePhrases = [
    'focus on', 'work on', 'improve', 'enhance', 'optimize', 'consider',
    'try to', 'should', 'could', 'maybe', 'ongoing', 'monitor', 'review',
    'think about', 'look into', 'explore', 'investigate'
  ];
  
  const action = insight.suggestedAction.toLowerCase();
  const timeline = insight.timeline.toLowerCase();
  
  // Check for vague action phrases
  const hasVagueAction = vaguePhrases.some(phrase => action.includes(phrase));
  
  // Check for vague timeline
  const hasVagueTimeline = timeline === 'ongoing' || timeline === 'tbd' || timeline === 'n/a';
  
  // Check for missing specific numbers or names (should have at least one number)
  const hasNumbers = /\d+/.test(insight.suggestedAction) || /\d+/.test(insight.description);
  
  // Check for action length (too short = likely vague)
  const actionTooShort = insight.suggestedAction.length < 20;
  
  // Insight is NOT SMART if it has vague phrases and lacks specificity
  if (hasVagueAction && !hasNumbers) {
    return false;
  }
  
  if (hasVagueTimeline || actionTooShort) {
    return false;
  }
  
  return true;
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

    const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const genAIModel = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 4096, // Sufficient for 6-8 concise insights
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
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

    // Compress data to reduce tokens
    const businessDataText = JSON.stringify(completeDataForAI);
    console.log('📊 Business data size:', businessDataText.length, 'chars (~' + Math.ceil(businessDataText.length / 4) + ' tokens estimated)');

    const prompt = `Generate 8-10 SMART business insights as JSON from this data:
${businessDataText}

JSON format:
{"insights":[{"type":"promotion|inventory|trend|feedback|forecast","title":"Title","description":"Details (max 140 chars)","confidence":70-95,"priority":"high|medium|low","suggestedAction":"Action (max 120 chars)","timeline":"Immediate|Next 7 days|Next 2 weeks|Next month","supportingData":"Data"}]}

Rules:
1. List ALL product names with exact quantities (NEVER "and X more")
2. Use ₱ with comma separators: ₱1,234,567 (NOT ₱1234567)
3. At least 2 insights must be type "forecast" using salesForecast/inventoryForecast
4. Be specific with numbers, products, and actionable steps
5. Return ONLY JSON (no markdown)

Good example:
{"type":"forecast","title":"URGENT: Gaming Laptop, 4K TV Need Restock","description":"Gaming Laptop 16GB (15 units), 4K TV (8 units) low stock","confidence":92,"priority":"high","suggestedAction":"Order 147x Gaming Laptop, 80x 4K TV","timeline":"Immediate","supportingData":"₱6,772,393 revenue at risk"}

Start JSON:`;

    const result = await genAIModel.generateContent(prompt);
    
    // Check response metadata for issues
    const response = result.response;
    const candidates = response.candidates;
    
    // Log detailed diagnostics
    console.log('=== Gemini Response Diagnostics ===');
    console.log('Prompt length:', prompt.length, 'chars (~' + Math.ceil(prompt.length / 4) + ' tokens estimated)');
    console.log('Max output tokens configured:', 4096);
    console.log('Candidates:', candidates?.length || 0);
    
    if (candidates && candidates[0]) {
      const candidate = candidates[0];
      console.log('Finish Reason:', candidate.finishReason);
      console.log('Safety Ratings:', candidate.safetyRatings ? JSON.stringify(candidate.safetyRatings) : 'undefined');
      console.log('Has content?:', !!candidate.content);
      console.log('Has parts?:', !!candidate.content?.parts);
      console.log('Parts count:', candidate.content?.parts?.length || 0);
      
      if (candidate.finishReason === 'MAX_TOKENS') {
        console.warn('⚠️ WARNING: Hit MAX_TOKENS limit. Response may be incomplete.');
        console.log('This is UNEXPECTED with input ~1,236 tokens and output limit 4,096 tokens');
        console.log('Possible causes: Data serialization issue or response.text() error');
      }
      
      // Check for safety blocks
      if (candidate.finishReason === 'SAFETY') {
        console.error('🛑 BLOCKED BY SAFETY FILTER');
        console.log('Safety ratings:', JSON.stringify(candidate.safetyRatings, null, 2));
      }
    }
    console.log('=== End Diagnostics ===');
    
    let text = '';
    
    // Try multiple extraction methods
    try {
      text = response.text();
      console.log('✅ Extracted text using response.text()');
    } catch (textError) {
      console.error('❌ response.text() failed:', textError);
      
      // Method 2: Try to extract from candidates directly
      if (candidates && candidates[0] && candidates[0].content) {
        console.log('Attempting alternative extraction from candidate.content...');
        console.log('Content structure:', JSON.stringify(candidates[0].content, null, 2).substring(0, 300));
        
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const content = candidates[0].content as any;
          const parts = content.parts;
          if (parts && parts.length > 0) {
            if (parts[0].text) {
              text = parts[0].text;
              console.log('✅ Extracted text from candidate.content.parts[0].text');
            } else if (typeof parts[0] === 'string') {
              text = parts[0];
              console.log('✅ Extracted text from candidate.content.parts[0] (string)');
            }
          } else if (content.text) {
            // Method 3: Maybe text is directly on content
            text = content.text;
            console.log('✅ Extracted text from candidate.content.text');
          } else if (typeof content === 'string') {
            // Method 4: Maybe content itself is a string
            text = content;
            console.log('✅ Extracted text from candidate.content (string)');
          } else {
            console.error('❌ Could not find text in any expected location');
            console.log('Full candidate structure:', JSON.stringify(candidates[0], null, 2).substring(0, 500));
          }
        } catch (partsError) {
          console.error('❌ Alternative extraction failed:', partsError);
        }
      }
    }
    
    // Log the raw response for debugging
    console.log('=== Gemini Raw Response (first 500 chars) ===');
    console.log(text.substring(0, 500));
    console.log('=== End Raw Response ===');
    
    // Check if response is empty or blocked
    if (!text || text.trim().length === 0) {
      console.error('ERROR: Gemini returned empty response');
      console.log('Possible causes: Safety filters, token limits, or content policy');
      console.log('Prompt length:', prompt.length, 'characters');
      
      const fallbackInsights = generateFallbackInsights(userBusinessData);
      const forecastInsights = generateForecastInsights(salesForecast, inventoryForecast, fallbackInsights.length);
      const formattedFallbacks = [...fallbackInsights, ...forecastInsights].map(insight => 
        formatInsightCurrency(insight)
      );
      return NextResponse.json({ insights: formattedFallbacks });
    }
    
    // Clean up the response - remove markdown code blocks and any extra text
    let cleanedText = text.trim();
    
    // Remove markdown code blocks
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```\s*$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```\s*$/, '');
    }
    
    // Find JSON object in the text (in case there's extra text before/after)
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    } else {
      console.error('ERROR: No JSON object found in response');
      console.log('Cleaned text:', cleanedText.substring(0, 200));
      const fallbackInsights = generateFallbackInsights(userBusinessData);
      const forecastInsights = generateForecastInsights(salesForecast, inventoryForecast, fallbackInsights.length);
      const formattedFallbacks = [...fallbackInsights, ...forecastInsights].map(insight => 
        formatInsightCurrency(insight)
      );
      return NextResponse.json({ insights: formattedFallbacks });
    }
    
    // Remove any trailing commas before closing brackets (common AI mistake)
    cleanedText = cleanedText.replace(/,(\s*[}\]])/g, '$1');
    
    // Validate JSON structure - check if it's complete
    const openBraces = (cleanedText.match(/\{/g) || []).length;
    let closeBraces = (cleanedText.match(/\}/g) || []).length;
    const openBrackets = (cleanedText.match(/\[/g) || []).length;
    let closeBrackets = (cleanedText.match(/\]/g) || []).length;
    
    // If JSON is incomplete, try to fix it
    if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
      console.log('Incomplete JSON detected, attempting to fix...');
      console.log(`Open braces: ${openBraces}, Close braces: ${closeBraces}`);
      console.log(`Open brackets: ${openBrackets}, Close brackets: ${closeBrackets}`);
      
      // Add missing closing brackets/braces
      while (openBrackets > closeBrackets) {
        cleanedText += ']';
        closeBrackets++;
      }
      while (openBraces > closeBraces) {
        cleanedText += '}';
        closeBraces++;
      }
      
      console.log('JSON auto-fix applied');
    }
    
    // Final validation - check if we have minimum JSON structure
    if (cleanedText.length < 20 || !cleanedText.includes('"insights"')) {
      console.error('ERROR: Invalid JSON structure after cleaning');
      console.log('Final cleaned text:', cleanedText);
      const fallbackInsights = generateFallbackInsights(userBusinessData);
      const forecastInsights = generateForecastInsights(salesForecast, inventoryForecast, fallbackInsights.length);
      const formattedFallbacks = [...fallbackInsights, ...forecastInsights].map(insight => 
        formatInsightCurrency(insight)
      );
      return NextResponse.json({ insights: formattedFallbacks });
    }

    // Parse the JSON response
    let parsedInsights;
    try {
      parsedInsights = JSON.parse(cleanedText);
      
      // Validate that we got insights array
      if (!parsedInsights || !parsedInsights.insights || !Array.isArray(parsedInsights.insights)) {
        throw new Error('Invalid insights structure');
      }
      
      // Validate each insight has required fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsedInsights.insights = parsedInsights.insights.filter((insight: any) => {
        return insight.type && insight.title && insight.description && 
               insight.confidence && insight.priority && insight.suggestedAction;
      });
      
      // Filter out non-SMART insights (vague, not actionable)
      const beforeSmartFilter = parsedInsights.insights.length;
      parsedInsights.insights = parsedInsights.insights.filter((insight: GeneratedInsight) => 
        isSmartInsight(insight)
      );
      
      const removedCount = beforeSmartFilter - parsedInsights.insights.length;
      if (removedCount > 0) {
        console.log(`Filtered out ${removedCount} non-SMART insights (vague or not actionable)`);
      }
      
      if (parsedInsights.insights.length === 0) {
        throw new Error('No valid SMART insights found');
      }
      
    } catch (parseError) {
      console.error('=== JSON PARSING ERROR ===');
      console.error('Error:', parseError);
      console.error('Cleaned text length:', cleanedText?.length || 0);
      console.error('Cleaned text (first 300 chars):', cleanedText?.substring(0, 300));
      console.error('=== END ERROR ===');
      
      // Return fallback insights based on actual data (including forecasts)
      console.log('Returning fallback insights due to parsing failure');
      const fallbackInsights = generateFallbackInsights(userBusinessData);
      const forecastInsights = generateForecastInsights(salesForecast, inventoryForecast, fallbackInsights.length);
      
      // Apply currency formatting to fallback insights
      const formattedFallbacks = [...fallbackInsights, ...forecastInsights].map(insight => 
        formatInsightCurrency(insight)
      );
      
      console.log(`Returning ${formattedFallbacks.length} fallback insights`);
      
      return NextResponse.json({ 
        insights: formattedFallbacks
      });
    }

    // Validate and add IDs to insights (remove existing id if present to avoid conflict)
    // eslint-disable-next-line prefer-const
    let validatedInsights = parsedInsights.insights.map((insight: GeneratedInsight, index: number) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...insightWithoutId } = insight;
      return {
        ...insightWithoutId,
        id: `${Date.now()}-${index}`
      };
    });

    // ENSURE we always have forecast insights - add them if Gemini didn't generate them
    const forecastInsights = validatedInsights.filter((i: GeneratedInsight) => i.type === 'forecast');
    const needsMoreForecasts = forecastInsights.length < 2;
    const needsMoreInsightsTotal = validatedInsights.length < 8;

    if (needsMoreForecasts || needsMoreInsightsTotal) {
      const additionalInsights = generateForecastInsights(salesForecast, inventoryForecast, validatedInsights.length);
      
      // Add forecast insights that don't duplicate existing content
      for (const newInsight of additionalInsights) {
        const isDuplicate = validatedInsights.some((existing: GeneratedInsight) => 
          existing.title.toLowerCase().includes(newInsight.title.toLowerCase().split(' ')[0])
        );
        
        if (!isDuplicate) {
          validatedInsights.push(newInsight);
        }
        
        // Stop if we have enough
        if (validatedInsights.filter((i: GeneratedInsight) => i.type === 'forecast').length >= 2 && 
            validatedInsights.length >= 8) {
          break;
        }
      }
    }

    // Apply currency formatting to all insights before returning
    const formattedInsights = validatedInsights.map((insight: GeneratedInsight) => 
      formatInsightCurrency(insight)
    );

    return NextResponse.json({ insights: formattedInsights });
  } catch (err: unknown) {
    console.error('Business insights generation error:', err);
    return NextResponse.json({ error: 'Failed to generate business insights' }, { status: 500 });
  }
}

// Generate forecast-specific insights from forecast data
function generateForecastInsights(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  salesForecast: any, 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inventoryForecast: any, 
  startIndex: number
): GeneratedInsight[] {
  const insights: GeneratedInsight[] = [];
  const timestamp = Date.now() + startIndex;

  // Sales forecast insight
  if (salesForecast && salesForecast.nextMonth) {
    const { predictedRevenue, predictedOrders, confidence, trend } = salesForecast.nextMonth;
    const trendEmoji = trend === 'increasing' ? '📈' : trend === 'decreasing' ? '📉' : '➡️';
    
    insights.push({
      id: `${timestamp}-forecast-sales`,
      type: 'forecast',
      title: `Next Month: ₱${predictedRevenue.toFixed(0)} Expected`,
      description: `Forecast predicts ₱${predictedRevenue.toFixed(0)} revenue with ${predictedOrders} orders. Trend: ${trend} ${trendEmoji}`,
      confidence: confidence,
      priority: trend === 'decreasing' ? 'high' : 'medium',
      suggestedAction: trend === 'increasing' ? 'Prepare inventory for growth' : 'Review marketing strategy',
      timeline: 'Next month',
      supportingData: `${confidence}% confidence, ${predictedOrders} predicted orders`
    });
  }

  // Inventory forecast insight - urgent restocks (SMART format)
  if (inventoryForecast && inventoryForecast.productsNeedingRestock) {
    const urgentProducts = inventoryForecast.productsNeedingRestock.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.estimatedDaysUntilStockout < 7
    );
    
    if (urgentProducts.length > 0) {
      // SPECIFIC: List ALL product names with current stock (no days left in description for cleaner look)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productDetails = urgentProducts.map((p: any) => 
        `${p.name} (${p.currentStock} units)`
      ).join(', ');
      
      // MEASURABLE: Show exact quantities per product
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const restockBreakdown = urgentProducts.map((p: any) => 
        `${p.recommendedRestockQuantity}x ${p.name}`
      ).join(', ');
      
      insights.push({
        id: `${timestamp}-forecast-inventory-urgent`,
        type: 'forecast',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        title: `URGENT: ${urgentProducts.slice(0, 3).map((p: any) => p.name).join(', ')}`,
        description: productDetails.length > 140 ? productDetails.substring(0, 137) + '...' : productDetails,
        confidence: 92,
        priority: 'high',
        suggestedAction: `Order: ${restockBreakdown}`,
        timeline: 'Immediate',
        supportingData: `${urgentProducts.length} products <7 days stock`
      });
    } else if (inventoryForecast.productsNeedingRestock.length > 0) {
      // Non-urgent restocks (SMART format)
      const products = inventoryForecast.productsNeedingRestock;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productList = products.map((p: any) => 
        `${p.name} (${p.currentStock} units)`
      ).join(', ');
      
      insights.push({
        id: `${timestamp}-forecast-inventory`,
        type: 'forecast',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        title: `Restock: ${products.slice(0, 2).map((p: any) => p.name).join(', ')}`,
        description: productList.length > 140 ? productList.substring(0, 137) + '...' : productList,
        confidence: 88,
        priority: 'medium',
        suggestedAction: `Order quantities per forecast data`,
        timeline: 'Next 2 weeks',
        supportingData: `${products.length} products below 14-day supply`
      });
    }
  }

  // Weekly sales forecast
  if (salesForecast && salesForecast.nextWeek) {
    const { predictedRevenue, predictedOrders, confidence } = salesForecast.nextWeek;
    
    insights.push({
      id: `${timestamp}-forecast-weekly`,
      type: 'forecast',
      title: `Next Week: ₱${predictedRevenue.toFixed(0)} Projected`,
      description: `Expecting ₱${predictedRevenue.toFixed(0)} in revenue with ${predictedOrders} orders next week.`,
      confidence: confidence,
      priority: 'low',
      suggestedAction: 'Ensure adequate stock for the week',
      timeline: 'Next 7 days',
      supportingData: `${confidence}% confidence, ${predictedOrders} orders predicted`
    });
  }

  // Overstock warning
  if (inventoryForecast && inventoryForecast.overstockedProducts && inventoryForecast.overstockedProducts.length > 0) {
    const overstocked = inventoryForecast.overstockedProducts.slice(0, 2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productNames = overstocked.map((p: any) => p.name).join(', ');
    
    insights.push({
      id: `${timestamp}-forecast-overstock`,
      type: 'forecast',
      title: `${inventoryForecast.overstockedProducts.length} Overstocked Products`,
      description: `${productNames} have 90+ days of inventory. Consider promotions to move stock.`,
      confidence: 85,
      priority: 'low',
      suggestedAction: 'Run clearance sale (15-20% discount)',
      timeline: 'Next 2 weeks',
      supportingData: `${inventoryForecast.overstockedProducts.length} products with excess inventory`
    });
  }

  return insights;
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

