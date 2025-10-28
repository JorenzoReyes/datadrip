import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only handle uploads paths
  if (!pathname.startsWith('/uploads/')) {
    return NextResponse.next();
  }
  
  try {
    // Security: prevent directory traversal
    if (pathname.includes('..') || pathname.includes('~')) {
      return new NextResponse('Invalid file path', { status: 400 });
    }
    
    const filePath = join(process.cwd(), 'public', pathname);
    
    // Check if file exists
    try {
      const stats = await stat(filePath);
      if (!stats.isFile()) {
        return new NextResponse('File not found', { status: 404 });
      }
    } catch {
      return new NextResponse('File not found', { status: 404 });
    }
    
    // Read the file
    const fileBuffer = await readFile(filePath);
    
    // Determine content type based on file extension
    const extension = pathname.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'mp4':
        contentType = 'video/mp4';
        break;
      case 'webm':
        contentType = 'video/webm';
        break;
      case 'mov':
        contentType = 'video/quicktime';
        break;
    }
    
    return new NextResponse(fileBuffer as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
    
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Failed to serve file', { status: 500 });
  }
}

export const config = {
  matcher: '/uploads/:path*',
};
