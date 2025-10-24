import * as XLSX from 'xlsx';
import { BusinessData } from './businessDataService';

export interface ExportOptions {
  businessData: BusinessData;
  salesPerformance: {
    total_revenue?: number;
    total_quantity?: number;
    total_orders?: number;
    avg_order_value?: number;
  };
  inventoryInsights: {
    total_products?: number;
    out_of_stock?: number;
    low_stock?: number;
    overstocked?: number;
    avg_stock_level?: number;
  };
  shopPerformance: Array<{
    name: string;
    platform: string;
    total_revenue?: number;
  }>;
  reportType: string;
  format: string;
  dateRange: string;
}

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

export class ExportService {
  static async generateExport(options: ExportOptions): Promise<ExportResult> {
    const { businessData, salesPerformance, inventoryInsights, shopPerformance, reportType, format } = options;
    
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `datadrip_${reportType}_report_${timestamp}`;

    switch (format.toLowerCase()) {
      case 'csv':
        return this.generateCSVExport(businessData, salesPerformance, inventoryInsights, shopPerformance, reportType, baseFilename);
      
      case 'json':
        return this.generateJSONExport(businessData, salesPerformance, inventoryInsights, shopPerformance, reportType, baseFilename);
      
      case 'xlsx':
        return this.generateXLSXExport(businessData, salesPerformance, inventoryInsights, shopPerformance, reportType, baseFilename);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private static generateCSVExport(
    businessData: BusinessData,
    salesPerformance: ExportOptions['salesPerformance'],
    inventoryInsights: ExportOptions['inventoryInsights'],
    shopPerformance: ExportOptions['shopPerformance'],
    reportType: string,
    baseFilename: string
  ): ExportResult {
    let csvContent = '';
    const filename = `${baseFilename}.csv`;

    switch (reportType) {
      case 'sales':
        csvContent = this.generateSalesCSV(businessData, salesPerformance);
        break;
      
      case 'products':
        csvContent = this.generateProductsCSV(businessData);
        break;
      
      case 'inventory':
        csvContent = this.generateInventoryCSV(businessData, inventoryInsights);
        break;
      
      case 'shops':
        csvContent = this.generateShopsCSV(businessData, shopPerformance);
        break;
      
      case 'comprehensive':
        csvContent = this.generateComprehensiveCSV(businessData, salesPerformance, inventoryInsights);
        break;
      
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    return {
      buffer: Buffer.from(csvContent, 'utf-8'),
      contentType: 'text/csv',
      filename
    };
  }

  private static generateJSONExport(
    businessData: BusinessData,
    salesPerformance: ExportOptions['salesPerformance'],
    inventoryInsights: ExportOptions['inventoryInsights'],
    shopPerformance: ExportOptions['shopPerformance'],
    reportType: string,
    baseFilename: string
  ): ExportResult {
    let exportData: Record<string, unknown> = {};
    const filename = `${baseFilename}.json`;

    switch (reportType) {
      case 'sales':
        exportData = {
          reportType: 'sales',
          generatedAt: new Date().toISOString(),
          salesPerformance,
          recentSales: businessData.recentSales,
          topProducts: businessData.topProducts
        };
        break;
      
      case 'products':
        exportData = {
          reportType: 'products',
          generatedAt: new Date().toISOString(),
          products: businessData.products,
          totalProducts: businessData.totalProducts
        };
        break;
      
      case 'inventory':
        exportData = {
          reportType: 'inventory',
          generatedAt: new Date().toISOString(),
          inventoryInsights,
          products: businessData.products
        };
        break;
      
      case 'shops':
        exportData = {
          reportType: 'shops',
          generatedAt: new Date().toISOString(),
          shops: businessData.shops,
          shopPerformance,
          totalShops: businessData.totalShops
        };
        break;
      
      case 'comprehensive':
        exportData = {
          reportType: 'comprehensive',
          generatedAt: new Date().toISOString(),
          businessData,
          salesPerformance,
          inventoryInsights,
          shopPerformance
        };
        break;
      
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    return {
      buffer: Buffer.from(JSON.stringify(exportData, null, 2), 'utf-8'),
      contentType: 'application/json',
      filename
    };
  }

  private static generateXLSXExport(
    businessData: BusinessData,
    salesPerformance: ExportOptions['salesPerformance'],
    inventoryInsights: ExportOptions['inventoryInsights'],
    shopPerformance: ExportOptions['shopPerformance'],
    reportType: string,
    baseFilename: string
  ): ExportResult {
    const workbook = XLSX.utils.book_new();
    const filename = `${baseFilename}.xlsx`;

    switch (reportType) {
      case 'sales':
        this.addSalesSheets(workbook, businessData, salesPerformance);
        break;
      
      case 'products':
        this.addProductsSheets(workbook, businessData);
        break;
      
      case 'inventory':
        this.addInventorySheets(workbook, businessData, inventoryInsights);
        break;
      
      case 'shops':
        this.addShopsSheets(workbook, businessData, shopPerformance);
        break;
      
      case 'comprehensive':
        this.addComprehensiveSheets(workbook, businessData, salesPerformance, inventoryInsights, shopPerformance);
        break;
      
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename
    };
  }

  // CSV Generation Methods
  private static generateSalesCSV(businessData: BusinessData, salesPerformance: ExportOptions['salesPerformance']): string {
    let csv = 'Sales Performance Report\n';
    csv += 'Metric,Value\n';
    csv += `Total Revenue (₱),${salesPerformance.total_revenue || 0}\n`;
    csv += `Total Quantity Sold,${salesPerformance.total_quantity || 0}\n`;
    csv += `Total Orders,${salesPerformance.total_orders || 0}\n`;
    csv += `Average Order Value (₱),${salesPerformance.avg_order_value || 0}\n\n`;
    
    csv += 'Recent Sales (Last 30 Days)\n';
    csv += 'Date,Daily Revenue (₱),Daily Quantity,Daily Orders\n';
    businessData.recentSales.forEach(sale => {
      csv += `${sale.sale_date},${sale.daily_revenue},${sale.daily_quantity},${sale.daily_orders}\n`;
    });
    
    csv += '\nTop Selling Products\n';
    csv += 'Product Name,Stock,Price (₱),Category,Quantity Sold,Revenue (₱),Transactions\n';
    businessData.topProducts.forEach(product => {
      csv += `"${product.name}",${product.stock},${product.price},"${product.category || 'N/A'}",${product.actual_sales_count},${product.actual_sales_revenue},${product.total_transactions}\n`;
    });

    return csv;
  }

  private static generateProductsCSV(businessData: BusinessData): string {
    let csv = 'Products Report\n';
    csv += 'Product Name,SKU,Brand,Category,Subcategory,Price (₱),Stock,Status,Quantity Sold,Revenue (₱),Transactions\n';
    
    businessData.products.forEach(product => {
      csv += `"${product.name}","${product.sku || 'N/A'}","${product.brand || 'N/A'}","${product.category || 'N/A'}","${product.subcategory || 'N/A'}",${product.price},${product.stock},${product.status},${product.actual_sales_count},${product.actual_sales_revenue},${product.total_sales_transactions}\n`;
    });

    return csv;
  }

  private static generateInventoryCSV(businessData: BusinessData, inventoryInsights: ExportOptions['inventoryInsights']): string {
    let csv = 'Inventory Report\n';
    csv += 'Metric,Value\n';
    csv += `Total Products,${inventoryInsights.total_products || 0}\n`;
    csv += `Out of Stock,${inventoryInsights.out_of_stock || 0}\n`;
    csv += `Low Stock (<10),${inventoryInsights.low_stock || 0}\n`;
    csv += `Overstocked (>100),${inventoryInsights.overstocked || 0}\n`;
    csv += `Average Stock Level,${inventoryInsights.avg_stock_level || 0}\n\n`;
    
    csv += 'Product Inventory Details\n';
    csv += 'Product Name,Category,Stock,Price (₱),Status\n';
    
    businessData.products.forEach(product => {
      csv += `"${product.name}","${product.category || 'N/A'}",${product.stock},${product.price},${product.status}\n`;
    });

    return csv;
  }

  private static generateShopsCSV(businessData: BusinessData, shopPerformance: ExportOptions['shopPerformance']): string {
    let csv = 'Shops Report\n';
    csv += 'Shop Name,Platform,Account Name,Products Count,Followers,Rating,Rating Count,Chat Performance (%),Total Revenue (₱)\n';
    
    businessData.shops.forEach(shop => {
      const performance = shopPerformance.find((sp) => sp.name === shop.name);
      csv += `"${shop.name}",${shop.platform},"${shop.account_name}",${shop.products_count},${shop.followers_count},${shop.rating_value},${shop.rating_count},${shop.chat_performance_percent},${performance?.total_revenue || 0}\n`;
    });

    return csv;
  }

  private static generateComprehensiveCSV(businessData: BusinessData, salesPerformance: ExportOptions['salesPerformance'], inventoryInsights: ExportOptions['inventoryInsights']): string {
    let csv = 'Comprehensive Business Report\n\n';
    
    // Business Overview
    csv += 'Business Overview\n';
    csv += 'Metric,Value\n';
    csv += `Total Accounts,${businessData.totalAccounts}\n`;
    csv += `Total Shops,${businessData.totalShops}\n`;
    csv += `Total Products,${businessData.totalProducts}\n\n`;
    
    // Sales Performance
    csv += 'Sales Performance\n';
    csv += 'Metric,Value\n';
    csv += `Total Revenue (₱),${salesPerformance.total_revenue || 0}\n`;
    csv += `Total Quantity Sold,${salesPerformance.total_quantity || 0}\n`;
    csv += `Total Orders,${salesPerformance.total_orders || 0}\n`;
    csv += `Average Order Value (₱),${salesPerformance.avg_order_value || 0}\n\n`;
    
    // Inventory Summary
    csv += 'Inventory Summary\n';
    csv += 'Metric,Value\n';
    csv += `Total Products,${inventoryInsights.total_products || 0}\n`;
    csv += `Out of Stock,${inventoryInsights.out_of_stock || 0}\n`;
    csv += `Low Stock,${inventoryInsights.low_stock || 0}\n`;
    csv += `Overstocked,${inventoryInsights.overstocked || 0}\n\n`;
    
    // Recent Sales
    csv += 'Recent Sales (Last 30 Days)\n';
    csv += 'Date,Daily Revenue (₱),Daily Quantity,Daily Orders\n';
    businessData.recentSales.forEach(sale => {
      csv += `${sale.sale_date},${sale.daily_revenue},${sale.daily_quantity},${sale.daily_orders}\n`;
    });
    
    csv += '\nTop Selling Products\n';
    csv += 'Product Name,Stock,Price (₱),Category,Quantity Sold,Revenue (₱),Transactions\n';
    businessData.topProducts.forEach(product => {
      csv += `"${product.name}",${product.stock},${product.price},"${product.category || 'N/A'}",${product.actual_sales_count},${product.actual_sales_revenue},${product.total_transactions}\n`;
    });

    return csv;
  }

  // XLSX Generation Methods
  private static addSalesSheets(workbook: XLSX.WorkBook, businessData: BusinessData, salesPerformance: ExportOptions['salesPerformance']) {
    // Sales Performance Sheet
    const performanceData = [
      ['Metric', 'Value'],
      ['Total Revenue (₱)', salesPerformance.total_revenue || 0],
      ['Total Quantity Sold', salesPerformance.total_quantity || 0],
      ['Total Orders', salesPerformance.total_orders || 0],
      ['Average Order Value (₱)', salesPerformance.avg_order_value || 0]
    ];
    
    const performanceSheet = XLSX.utils.aoa_to_sheet(performanceData);
    XLSX.utils.book_append_sheet(workbook, performanceSheet, 'Sales Performance');

    // Recent Sales Sheet
    const recentSalesData = [
      ['Date', 'Daily Revenue (₱)', 'Daily Quantity', 'Daily Orders'],
      ...businessData.recentSales.map(sale => [
        sale.sale_date,
        sale.daily_revenue,
        sale.daily_quantity,
        sale.daily_orders
      ])
    ];
    
    const recentSalesSheet = XLSX.utils.aoa_to_sheet(recentSalesData);
    XLSX.utils.book_append_sheet(workbook, recentSalesSheet, 'Recent Sales');

    // Top Products Sheet
    const topProductsData = [
      ['Product Name', 'Stock', 'Price (₱)', 'Category', 'Quantity Sold', 'Revenue (₱)', 'Transactions'],
      ...businessData.topProducts.map(product => [
        product.name,
        product.stock,
        product.price,
        product.category || 'N/A',
        product.actual_sales_count,
        product.actual_sales_revenue,
        product.total_transactions
      ])
    ];
    
    const topProductsSheet = XLSX.utils.aoa_to_sheet(topProductsData);
    XLSX.utils.book_append_sheet(workbook, topProductsSheet, 'Top Products');
  }

  private static addProductsSheets(workbook: XLSX.WorkBook, businessData: BusinessData) {
    const productsData = [
      ['Product Name', 'SKU', 'Brand', 'Category', 'Subcategory', 'Price (₱)', 'Stock', 'Status', 'Quantity Sold', 'Revenue (₱)', 'Transactions'],
      ...businessData.products.map(product => [
        product.name,
        product.sku || 'N/A',
        product.brand || 'N/A',
        product.category || 'N/A',
        product.subcategory || 'N/A',
        product.price,
        product.stock,
        product.status,
        product.actual_sales_count,
        product.actual_sales_revenue,
        product.total_sales_transactions
      ])
    ];
    
    const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
    XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');
  }

  private static addInventorySheets(workbook: XLSX.WorkBook, businessData: BusinessData, inventoryInsights: ExportOptions['inventoryInsights']) {
    // Inventory Summary Sheet
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Products', inventoryInsights.total_products || 0],
      ['Out of Stock', inventoryInsights.out_of_stock || 0],
      ['Low Stock (<10)', inventoryInsights.low_stock || 0],
      ['Overstocked (>100)', inventoryInsights.overstocked || 0],
      ['Average Stock Level', inventoryInsights.avg_stock_level || 0]
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Inventory Summary');

    // Product Details Sheet
    const productsData = [
      ['Product Name', 'Category', 'Stock', 'Price (₱)', 'Status'],
      ...businessData.products.map(product => [
        product.name,
        product.category || 'N/A',
        product.stock,
        product.price,
        product.status
      ])
    ];
    
    const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
    XLSX.utils.book_append_sheet(workbook, productsSheet, 'Product Details');
  }

  private static addShopsSheets(workbook: XLSX.WorkBook, businessData: BusinessData, shopPerformance: ExportOptions['shopPerformance']) {
    const shopsData = [
      ['Shop Name', 'Platform', 'Account Name', 'Products Count', 'Followers', 'Rating', 'Rating Count', 'Chat Performance (%)', 'Total Revenue (₱)'],
      ...businessData.shops.map(shop => {
        const performance = shopPerformance.find((sp) => sp.name === shop.name);
        return [
          shop.name,
          shop.platform,
          shop.account_name,
          shop.products_count,
          shop.followers_count,
          shop.rating_value,
          shop.rating_count,
          shop.chat_performance_percent,
          performance?.total_revenue || 0
        ];
      })
    ];
    
    const shopsSheet = XLSX.utils.aoa_to_sheet(shopsData);
    XLSX.utils.book_append_sheet(workbook, shopsSheet, 'Shops');
  }

  private static addComprehensiveSheets(workbook: XLSX.WorkBook, businessData: BusinessData, salesPerformance: ExportOptions['salesPerformance'], inventoryInsights: ExportOptions['inventoryInsights'], shopPerformance: ExportOptions['shopPerformance']) {
    // Add all individual sheets
    this.addSalesSheets(workbook, businessData, salesPerformance);
    this.addProductsSheets(workbook, businessData);
    this.addInventorySheets(workbook, businessData, inventoryInsights);
    this.addShopsSheets(workbook, businessData, shopPerformance);

    // Add Business Overview Sheet
    const overviewData = [
      ['Business Overview'],
      ['Total Accounts', businessData.totalAccounts],
      ['Total Shops', businessData.totalShops],
      ['Total Products', businessData.totalProducts],
      [''],
      ['Sales Performance'],
      ['Total Revenue (₱)', salesPerformance.total_revenue || 0],
      ['Total Quantity Sold', salesPerformance.total_quantity || 0],
      ['Total Orders', salesPerformance.total_orders || 0],
      ['Average Order Value (₱)', salesPerformance.avg_order_value || 0],
      [''],
      ['Inventory Summary'],
      ['Total Products', inventoryInsights.total_products || 0],
      ['Out of Stock', inventoryInsights.out_of_stock || 0],
      ['Low Stock', inventoryInsights.low_stock || 0],
      ['Overstocked', inventoryInsights.overstocked || 0]
    ];
    
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Business Overview');
  }
}
