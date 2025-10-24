import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('Lazada OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?oauth_error=${encodeURIComponent(error)}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?oauth_error=missing_code_or_state`
      );
    }

    // Validate state parameter
    if (!global.oauthStates || !global.oauthStates.has(state)) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?oauth_error=invalid_state`
      );
    }

    const stateData = global.oauthStates.get(state);
    
    // Check if state data exists
    if (!stateData) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?oauth_error=invalid_state`
      );
    }
    
    // Check if state has expired
    if (Date.now() > stateData.expiresAt) {
      global.oauthStates.delete(state);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?oauth_error=state_expired`
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://auth.lazada.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.LAZADA_CLIENT_ID || 'demo_client_id',
        client_secret: process.env.LAZADA_CLIENT_SECRET || 'demo_client_secret',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/callback/lazada`
      })
    });

    if (!tokenResponse.ok) {
      console.error('Failed to exchange code for token:', await tokenResponse.text());
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?oauth_error=token_exchange_failed`
      );
    }

        // const tokenData = await tokenResponse.json();
    
    // Clean up state
    global.oauthStates.delete(state);

        // Store tokens securely (in production, use database)
        // const tokenStorage = {
        //   userId: stateData.userId,
        //   platform: 'lazada',
        //   accessToken: tokenData.access_token,
        //   refreshToken: tokenData.refresh_token,
        //   expiresAt: Date.now() + (tokenData.expires_in * 1000),
        //   createdAt: new Date().toISOString()
        // };

    // For demo purposes, redirect to success page
    const successParams = new URLSearchParams({
      platform: 'lazada',
      status: 'success',
      message: 'Successfully connected to Lazada!'
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?${successParams.toString()}`
    );

  } catch (error) {
    console.error('Lazada OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?oauth_error=callback_error`
    );
  }
}
