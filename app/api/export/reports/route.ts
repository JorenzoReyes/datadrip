import { NextResponse } from 'next/server';
import { BusinessDataService } from '../../../services/businessDataService';
import { EnhancedDataSanitizationService } from '../../../services/enhancedDataSanitizationService';
import { ExportService } from '../../../services/exportService';

export async function POST(req: Request) {
  try {
    const { userId, reportType, format, dateRange } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!reportType || !format) {
      return NextResponse.json({ 
        error: 'Report type and format are required' 
      }, { status: 400 });
    }

    // Validate report types
    const validReportTypes = ['sales', 'products', 'inventory', 'shops', 'comprehensive'];
    if (!validReportTypes.includes(reportType)) {
      return NextResponse.json({ 
        error: 'Invalid report type. Valid types: sales, products, inventory, shops, comprehensive' 
      }, { status: 400 });
    }

    // Validate formats
    const validFormats = ['csv', 'json', 'xlsx'];
    if (!validFormats.includes(format)) {
      return NextResponse.json({ 
        error: 'Invalid format. Valid formats: csv, json, xlsx' 
      }, { status: 400 });
    }

    // Fetch user's business data
    let businessData: unknown;
    let salesPerformance: unknown;
    let inventoryInsights: unknown;
    let shopPerformance: unknown;
    
    try {
      // Auto-sync sales data to ensure accuracy
      await BusinessDataService.syncProductSalesData(userId);
      businessData = await BusinessDataService.getUserBusinessData(userId);
      salesPerformance = await BusinessDataService.getSalesPerformance(userId, 30);
      inventoryInsights = await BusinessDataService.getInventoryInsights(userId);
      shopPerformance = await BusinessDataService.getShopPerformance(userId);
      
      // Log data access for audit
      EnhancedDataSanitizationService.logDataAccess(userId, 'export_reports', true);
    } catch (error) {
      console.error('Error fetching user business data:', error);
      return NextResponse.json({ error: 'Failed to fetch business data' }, { status: 500 });
    }

    // Generate export based on report type and format
    let exportResult;
    try {
      exportResult = await ExportService.generateExport({
        businessData: businessData as Parameters<typeof ExportService.generateExport>[0]['businessData'],
        salesPerformance: salesPerformance as Parameters<typeof ExportService.generateExport>[0]['salesPerformance'],
        inventoryInsights: inventoryInsights as Parameters<typeof ExportService.generateExport>[0]['inventoryInsights'],
        shopPerformance: shopPerformance as Parameters<typeof ExportService.generateExport>[0]['shopPerformance'],
        reportType,
        format,
        dateRange: dateRange || '30d'
      });
    } catch (error) {
      console.error('Error generating export:', error);
      return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
    }

    // Return the export file
    const uint8Array = new Uint8Array(exportResult.buffer);
    const blob = new Blob([uint8Array], { type: exportResult.contentType });
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': exportResult.contentType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        'Content-Length': exportResult.buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Export reports error:', error);
    return NextResponse.json({ error: 'Failed to export reports' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Export Reports API',
    supportedFormats: ['csv', 'json', 'xlsx'],
    supportedReportTypes: ['sales', 'products', 'inventory', 'shops', 'comprehensive'],
    usage: 'POST with userId, reportType, format, and optional dateRange'
  });
}
