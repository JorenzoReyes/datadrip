import { NextResponse } from 'next/server';
import { BusinessDataService } from '../../../services/businessDataService';
import { EnhancedDataSanitizationService } from '../../../services/enhancedDataSanitizationService';

// We type import inside the handler to avoid breaking local dev if the package isn't installed yet

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GOOGLE_API_KEY' }, { status: 500 });
    }

    const { topic, customQuestion, history, businessContext, userId, model = 'gemini-2.5-flash' } = await req.json();

    // Fetch user's business data using service layer
    let userBusinessData = {};
    let sanitizedData = {};
    if (userId) {
      try {
        // Auto-sync sales data to ensure accuracy
        await BusinessDataService.syncProductSalesData(userId);
        userBusinessData = await BusinessDataService.getUserBusinessData(userId);
        
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

    // Handle custom questions vs predefined topics
    let systemPreamble: string;
    let guidanceText: string;
    let taskDescription: string;

    // Create sanitized business data context for AI
    const businessDataText = Object.keys(sanitizedData).length > 0 
      ? `\n\nBUSINESS INSIGHTS DATA (sanitized for analysis):
${JSON.stringify(sanitizedData, null, 2)}

Use this data to provide specific, data-driven insights. Reference the summary metrics, top products, and trends. Data has been sanitized for privacy while maintaining accuracy. All monetary values are in Philippine Peso (PHP) - use ₱ symbol when mentioning prices or revenue.`
      : '\n\nNote: No business data available. Provide general business advice based on best practices.';

    if (topic === 'custom' && customQuestion) {
      systemPreamble = `You are DataDrip's AI business analyst with access to the user's real business database. You have access to their actual sales data, products, shops, and performance metrics. Be concise, actionable, and data-driven. Respond in markdown. Use real numbers and specific insights from their actual business data. IMPORTANT: All monetary values are in Philippine Peso (PHP) - always use PHP currency symbol (₱) when mentioning prices or revenue.`;
      guidanceText = `Answer the user's specific question using their real business data. Reference actual sales numbers, product performance, inventory levels, and shop metrics. Provide specific, actionable recommendations based on their actual business performance.`;
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
        'customer-segment': `Analyze the user's actual customer data, shop performance, and sales patterns. Identify customer segments, behaviors, and opportunities based on real data.`,
        'sale-trends': `Analyze the user's actual sales trends, revenue patterns, and performance metrics. Identify peaks, valleys, and growth opportunities.`,
        'inventory-forecasting': `Analyze the user's actual inventory levels, stock movements, and product performance. Identify restock needs and overstock risks.`,
        'product-performance': `Analyze the user's actual product sales, revenue, and performance metrics. Identify top performers and underperformers.`
      } as Record<string, string>;

      systemPreamble = `You are DataDrip's AI business analyst with access to the user's real business database. You have access to their actual sales data, products, shops, and performance metrics. Be concise, actionable, and data-driven. Respond in markdown. Use real numbers and specific insights from their actual business data. IMPORTANT: All monetary values are in Philippine Peso (PHP) - always use PHP currency symbol (₱) when mentioning prices or revenue.`;
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

Constraints:
- Use markdown.
- Keep it to 150-250 words unless asked for more.
- Include 2-4 concise action items.
- Reference specific numbers and data from the user's actual business.
- If data is missing, state assumptions briefly.
- For custom questions, be specific and actionable based on real data.
- ALWAYS use PHP currency symbol (₱) for all monetary values - never use USD or $.
`;

    const result = await genAIModel.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ content: text });
  } catch (err: unknown) {
    console.error('Gemini insights error:', err);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}



