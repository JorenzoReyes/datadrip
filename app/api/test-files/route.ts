import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    
    // Check if uploads directory exists
    try {
      const stats = await stat(uploadsDir);
      console.log('Uploads directory exists:', stats.isDirectory());
    } catch (error) {
      return NextResponse.json({ 
        error: 'Uploads directory does not exist',
        path: uploadsDir 
      });
    }

    // List all files in uploads directory
    const files: any[] = [];
    
    try {
      const productsDir = join(uploadsDir, 'products');
      const productFiles = await readdir(productsDir);
      files.push(...productFiles.map(f => ({ 
        type: 'product', 
        name: f, 
        path: `/uploads/products/${f}` 
      })));
    } catch (error) {
      console.log('Products directory not found');
    }

    try {
      const videosDir = join(uploadsDir, 'videos');
      const videoFiles = await readdir(videosDir);
      files.push(...videoFiles.map(f => ({ 
        type: 'video', 
        name: f, 
        path: `/uploads/videos/${f}` 
      })));
    } catch (error) {
      console.log('Videos directory not found');
    }

    return NextResponse.json({
      uploadsDir,
      files,
      totalFiles: files.length
    });

  } catch (error) {
    console.error('Test files error:', error);
    return NextResponse.json({ 
      error: 'Failed to check files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
