import { NextRequest, NextResponse } from 'next/server';

// OAuth configuration for different platforms
const OAUTH_CONFIGS = {
  tiktok: {
    authUrl: 'https://auth.tiktok-shops.com/oauth/authorize',
    clientId: process.env.TIKTOK_CLIENT_ID || 'demo_client_id',
    scope: 'user.info.basic,item.list,item.publish,order.read',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/callback/tiktok`
  },
  shopee: {
    authUrl: 'https://partner.shopeemobile.com/api/v2/shop/auth_partner',
    clientId: process.env.SHOPEE_CLIENT_ID || 'demo_client_id',
    scope: 'read_products,write_products,read_orders',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/callback/shopee`
  },
  lazada: {
    authUrl: 'https://auth.lazada.com/oauth/authorize',
    clientId: process.env.LAZADA_CLIENT_ID || 'demo_client_id',
    scope: 'read_products,write_products,read_orders',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/callback/lazada`
  }
};

export async function POST(request: NextRequest) {
      try {
        const body = await request.json();
        const { platform, userId } = body;

        // Validate required fields
        if (!platform || !userId) {
          return NextResponse.json(
            { error: 'Platform and userId are required' },
            { status: 400 }
          );
        }

        // Check if platform is supported
        if (!OAUTH_CONFIGS[platform as keyof typeof OAUTH_CONFIGS]) {
          return NextResponse.json(
            { error: 'Unsupported platform' },
            { status: 400 }
          );
        }

        // For demo purposes, simulate OAuth success instead of redirecting to real OAuth
        const state = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store state in session/cache for validation later
        const stateData = {
          userId,
          platform,
          timestamp: Date.now(),
          expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
        };

        // For demo purposes, store in memory (in production, use proper storage)
        if (!global.oauthStates) {
          global.oauthStates = new Map();
        }
        global.oauthStates.set(state, stateData);

        // Simulate OAuth success by redirecting directly to callback with demo parameters
        const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/callback/${platform}?code=demo_code&state=${state}`;

        return NextResponse.json({
          success: true,
          authUrl: callbackUrl,
          state,
          demo: true // Flag to indicate this is a demo connection
        });

      } catch (error) {
        console.error('OAuth initiation error:', error);
        return NextResponse.json(
          { error: 'Failed to initiate OAuth flow' },
          { status: 500 }
        );
      }
    }
