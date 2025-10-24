import { NextResponse } from 'next/server';
import { BusinessDataService } from '../../../services/businessDataService';
import { EnhancedDataSanitizationService } from '../../../services/enhancedDataSanitizationService';

// We type import inside the handler to avoid breaking local dev if the package isn't installed yet

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'AI Insights feature is not configured. Please add GOOGLE_API_KEY environment variable to enable this feature. See README for setup instructions.' 
      }, { status: 503 });
    }

    const { topic, customQuestion, history, businessContext, userId, model = 'gemini-2.5-flash' } = await req.json();
    
    // Extract timeline context from businessContext
    const timeline = businessContext?.timeline;

    // Fetch user's business data using service layer
    let userBusinessData = {};
    let sanitizedData = {};
    let platformData = {};
    if (userId) {
      try {
        // Auto-sync sales data to ensure accuracy
        await BusinessDataService.syncProductSalesData(userId);
        
        // If timeline is provided, fetch timeline-specific data
        if (timeline && timeline.startDate && timeline.endDate) {
          console.log('📅 Fetching timeline-specific data for:', timeline.label);
          console.log('📅 Start date:', timeline.startDate);
          console.log('📅 End date:', timeline.endDate);
          
          // Convert ISO dates to YYYY-MM-DD format for database
          const startDate = new Date(timeline.startDate).toISOString().split('T')[0];
          const endDate = new Date(timeline.endDate).toISOString().split('T')[0];
          console.log('📅 Converted start date:', startDate);
          console.log('📅 Converted end date:', endDate);
          
          userBusinessData = await BusinessDataService.getUserBusinessDataForPeriod(userId, startDate, endDate);
          
          // Get timeline-specific platform data
          const salesByPlatform = await BusinessDataService.getSalesByPlatformForPeriod(userId, startDate, endDate);
          const shopeeTop5 = await BusinessDataService.getTopProductsByPlatformForPeriod(userId, 'shopee', startDate, endDate, 5);
          const lazadaTop5 = await BusinessDataService.getTopProductsByPlatformForPeriod(userId, 'lazada', startDate, endDate, 5);
          const tiktokTop5 = await BusinessDataService.getTopProductsByPlatformForPeriod(userId, 'tiktok', startDate, endDate, 5);
          
          platformData = {
            salesByPlatform,
            topProductsByPlatform: {
              shopee: shopeeTop5,
              lazada: lazadaTop5,
              tiktok: tiktokTop5
            }
          };
          
          // Debug: Log the fetched data
          console.log('📊 Timeline-specific data fetched:');
          console.log('📊 Sales by platform:', JSON.stringify(salesByPlatform, null, 2));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          console.log('📊 Top products (first 3):', JSON.stringify((userBusinessData as any).topProducts?.slice(0, 3), null, 2));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          console.log('📊 Recent sales (first 3):', JSON.stringify((userBusinessData as any).recentSales?.slice(0, 3), null, 2));
        } else {
          // Fallback to default data (last 30 days)
          console.log('📅 No timeline provided, using default data (last 30 days)');
          userBusinessData = await BusinessDataService.getUserBusinessData(userId);
          
          // Get platform-specific data
          const salesByPlatform = await BusinessDataService.getSalesByPlatform(userId, 30);
          const shopeeTop5 = await BusinessDataService.getTopProductsByPlatform(userId, 'shopee', 5);
          const lazadaTop5 = await BusinessDataService.getTopProductsByPlatform(userId, 'lazada', 5);
          const tiktokTop5 = await BusinessDataService.getTopProductsByPlatform(userId, 'tiktok', 5);
          
          platformData = {
            salesByPlatform,
            topProductsByPlatform: {
              shopee: shopeeTop5,
              lazada: lazadaTop5,
              tiktok: tiktokTop5
            }
          };
        }
        
        // Sanitize data before sending to AI (enhanced version maintains accuracy)
        sanitizedData = EnhancedDataSanitizationService.sanitizeForAI(userBusinessData);
        
        // Log data access for audit
        EnhancedDataSanitizationService.logDataAccess(userId, 'business_insights', true);
      } catch (error) {
        console.error('Error fetching user business data:', error);
        // Continue with empty data if database query fails
      }
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const genAIModel = genAI.getGenerativeModel({ 
      model: model,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: model === 'gemini-2.5-pro' ? 4096 : 2048,
      }
    });

    // Create timeline context text
    const timelineText = timeline ? `
CURRENT TIMELINE CONTEXT:
- Selected Period: ${timeline.label}
- Type: ${timeline.type}
- Date Range: ${timeline.startDate} to ${timeline.endDate}
- Month: ${timeline.month} ${timeline.year}

IMPORTANT: When the user asks about "this week", "current week", "selected week", or similar time-based queries, they are referring to the above timeline period. Use this specific date range to filter and analyze their data accordingly.` : '';

    // Debug logging
    console.log('=== Timeline Context Debug ===');
    console.log('Timeline received:', JSON.stringify(timeline, null, 2));
    console.log('Timeline text:', timelineText);
    console.log('=== End Timeline Debug ===');

    // Create sanitized business data context for AI
    const businessDataText = Object.keys(sanitizedData).length > 0 
      ? `\n\nBUSINESS INSIGHTS DATA (sanitized for analysis):
${JSON.stringify(sanitizedData, null, 2)}

PLATFORM-SPECIFIC DATA:
${JSON.stringify(platformData, null, 2)}
${timelineText}

IMPORTANT CAPABILITIES:
- You can answer platform-specific questions (Shopee, Lazada, TikTok)
- Examples: "show me top 5 sales in Shopee", "what are my best sellers on Lazada", "compare TikTok vs Shopee performance"
- Platform data includes: salesByPlatform (revenue breakdown), topProductsByPlatform (top products per platform)
- When asked about a specific platform, use the corresponding data from topProductsByPlatform
- When asked about time periods (this week, current week, selected week), use the timeline context above

CRITICAL CURRENCY FORMAT:
- ALL monetary values are in Philippine Peso (PHP)
- ALWAYS use ₱ symbol (NOT $ dollar sign)
- ALWAYS use comma thousand separators: ₱45,678 | ₱1,234.50 | ₱6,772,393.71
- Format large numbers properly: ₱6,772,393.71 (NOT ₱6772393.71)
- This applies to revenue, prices, sales, costs - ALL money amounts

Use this data to provide specific, data-driven insights. Reference actual sales numbers, product names, and platform-specific metrics.`
      : '\n\nNote: No business data available. Provide general business advice based on best practices.';

    // Handle custom questions vs predefined topics
    const systemPreamble = `You are DataDrip's AI business analyst with access to the user's real business database. You have access to their actual sales data, products, shops, and performance metrics across multiple platforms (Shopee, Lazada, TikTok). Be concise, actionable, and data-driven. Respond in markdown. Use real numbers and specific insights from their actual business data.

CRITICAL TIMELINE RULE: You MUST use the timeline context provided below. When the user asks about "this week", "current week", "selected week", or any time-based queries, you MUST refer to the specific timeline period provided in the context. DO NOT use your own date calculations or assumptions about what "this week" means. ALWAYS use the exact timeline period specified in the context.

CRITICAL CURRENCY RULE: ALL monetary values MUST use Philippine Peso symbol ₱ with comma thousand separators (NOT $ dollar sign). Examples: ₱45,678 | ₱1,234.50 | ₱6,772,393.71 (NOT ₱6772393.71). This is MANDATORY for ALL money amounts including revenue, sales, prices, costs, profits, etc.`;
    
    let guidanceText: string;
    let taskDescription: string;

    if (topic === 'custom' && customQuestion) {
      guidanceText = `Answer the user's specific question using their real business data. You can filter by platform if asked (e.g., "Shopee", "Lazada", "TikTok"). Reference actual sales numbers, product performance, inventory levels, and platform-specific metrics. Provide specific, actionable recommendations based on their actual business performance.

CRITICAL: If the user asks about "this week", "current week", or any time-based queries, you MUST use the timeline context provided above. DO NOT make assumptions about dates - use the exact timeline period specified in the context.`;
      taskDescription = `Custom Question: ${customQuestion}`;
    } else {
      const topicLabelMap: Record<string, string> = {
        'customer-segment': 'Customer Segment Analysis',
        'sale-trends': 'Sales Trends Analysis', 
        'inventory-forecasting': 'Inventory Forecasting',
        'product-performance': 'Product Performance Analysis'
      };

      const topicLabel = topicLabelMap[topic] || 'Business Insights';

      const guidance = {
        'customer-segment': `Analyze the user's actual customer data, shop performance, and sales patterns across platforms. Identify customer segments, behaviors, and opportunities based on real data.`,
        'sale-trends': `Analyze the user's actual sales trends, revenue patterns, and performance metrics across platforms (Shopee, Lazada, TikTok). Identify peaks, valleys, and growth opportunities per platform.`,
        'inventory-forecasting': `Analyze the user's actual inventory levels, stock movements, and product performance. Identify restock needs and overstock risks. Consider platform-specific demand.`,
        'product-performance': `Analyze the user's actual product sales, revenue, and performance metrics across platforms. Identify top performers and underperformers per platform.`
      } as Record<string, string>;

      guidanceText = guidance[topic] || 'Provide high-signal business insights based on real data.';
      taskDescription = `Task: ${topicLabel}`;
    }

    const historyText = Array.isArray(history)
      ? history
          .slice(-8)
          .map((m: { type: string; content: string }) => `${m.type === 'user' ? 'User' : 'AI'}: ${m.content}`)
          .join('\n')
      : '';

    const businessContextText = businessContext
      ? `\nBusiness Context (optional):\n${JSON.stringify(businessContext).slice(0, 4000)}`
      : '';

    const prompt = `
${systemPreamble}

${taskDescription}
Guidance: ${guidanceText}
${businessDataText}
${businessContextText}

Recent Chat (most recent last):
${historyText}

CRITICAL TIMELINE REQUIREMENT:
- If the user asks about "this week", "current week", "selected week", or any time-based queries, you MUST use the timeline context provided above
- DO NOT calculate your own dates or make assumptions about what "this week" means
- ALWAYS refer to the exact timeline period specified in the context
- Example: If context shows "Oct 5 - Oct 11, 2025", then "this week" means Oct 5-11, 2025

CRITICAL CURRENCY REQUIREMENT:
- ALL monetary values MUST use Philippine Peso symbol: ₱
- NEVER use $ (dollar sign)
- ALWAYS use comma thousand separators for readability
- Examples: ₱45,678 NOT $45,678 or ₱45678 | ₱6,772,393.71 NOT ₱6772393.71
- Format: ₱1,234 | ₱45,678 | ₱1,234.50 | ₱6,772,393.71
- This is MANDATORY for all numbers representing money

CRITICAL RESPONSE LENGTH (MUST COMPLETE):
- MAXIMUM 250 words - PLAN your response to finish within this limit
- Structure: Brief intro (2 sentences) → 3-4 bullet insights → 2-3 action items
- Each bullet point: 1-2 sentences max
- Prioritize quality over quantity
- ALWAYS end with complete sentences and proper punctuation
- If approaching limit, wrap up gracefully with final action item

Formatting Requirements:
- Use markdown for readability
- Bullet points for efficiency (• or numbered lists)
- Reference specific data: product names, numbers, percentages
- ALWAYS use ₱ (Philippine Peso) with comma separators: ₱1,234 | ₱45,678 | ₱6,772,393.71
- NEVER use $ (USD)

TOKEN BUDGET: ${model === 'gemini-2.5-pro' ? '~3500 tokens' : '~1800 tokens'} - allocate wisely to ensure completion
`;

    const result = await genAIModel.generateContent(prompt);
    let text = result.response.text();
    
    // Check if response appears incomplete (ends mid-sentence or with incomplete markdown)
    const trimmedText = text.trim();
    const isIncomplete = trimmedText.endsWith('**') || 
                        trimmedText.endsWith('*') || 
                        (!trimmedText.endsWith('.') && 
                         !trimmedText.endsWith('!') && 
                         !trimmedText.endsWith('?') &&
                         !trimmedText.endsWith(':'));
    
    // If incomplete, make a second request to complete the thought
    if (isIncomplete) {
      try {
        const completionPrompt = `You previously responded with: "${text.slice(-200)}"

This response was cut off. Please provide ONLY a brief 1-2 sentence conclusion to complete the thought. Be concise and end with proper punctuation.`;

        const completionResult = await genAIModel.generateContent(completionPrompt);
        const completion = completionResult.response.text().trim();
        
        // Remove any incomplete markdown at the end of original text
        const cleanedText = text.replace(/\*{1,2}$/, '').trimEnd();
        text = cleanedText + ' ' + completion;
        
        console.log('✅ Auto-completed truncated response');
      } catch (completionError) {
        console.error('Failed to auto-complete response:', completionError);
        // Fall back to adding truncation notice
        text = text + '\n\n*[Response truncated. Try asking a more specific question.]*';
      }
    }

    return NextResponse.json({ content: text });
  } catch (err: unknown) {
    console.error('Gemini insights error:', err);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}



