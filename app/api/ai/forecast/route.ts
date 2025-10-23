import { NextResponse } from 'next/server';
import { ForecastingService } from '../../../services/forecastingService';

export async function POST(req: Request) {
  try {
    const { userId, type } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (type === 'sales' || !type) {
      const salesForecast = await ForecastingService.forecastSales(userId);
      return NextResponse.json({ forecast: salesForecast, type: 'sales' });
    } else if (type === 'inventory') {
      const inventoryForecast = await ForecastingService.forecastInventory(userId);
      return NextResponse.json({ forecast: inventoryForecast, type: 'inventory' });
    } else if (type === 'both') {
      const salesForecast = await ForecastingService.forecastSales(userId);
      const inventoryForecast = await ForecastingService.forecastInventory(userId);
      return NextResponse.json({ 
        salesForecast, 
        inventoryForecast 
      });
    } else {
      return NextResponse.json({ error: 'Invalid forecast type. Use "sales", "inventory", or "both"' }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error('Forecasting error:', err);
    return NextResponse.json({ error: 'Failed to generate forecast' }, { status: 500 });
  }
}

