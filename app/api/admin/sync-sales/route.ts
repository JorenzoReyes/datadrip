import { NextResponse } from 'next/server';
import { BusinessDataService } from '../../../services/businessDataService';
import { AuditLogService } from '../../../services/auditLogService';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

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
