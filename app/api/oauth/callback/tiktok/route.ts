import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
      try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors
        if (error) {
          console.error('TikTok OAuth error:', error, errorDescription);
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?oauth_error=${encodeURIComponent(errorDescription || error)}`
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

        // Check if stateData exists
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

        // For demo purposes, simulate successful token exchange
        if (code === 'demo_code') {
          console.log('🎭 Demo OAuth flow for TikTok - simulating successful connection');
          
          // Clean up state
          global.oauthStates.delete(state);

          // For demo purposes, redirect to success page
          const successParams = new URLSearchParams({
            platform: 'tiktok',
            status: 'success',
            message: 'Successfully connected to TikTok Shop! Demo data will be linked to your dashboard.'
          });

          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?${successParams.toString()}`
          );
        }

        // Real OAuth flow (for production)
        const tokenResponse = await fetch('https://open-api.tiktokglobalshop.com/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: process.env.TIKTOK_CLIENT_ID || 'demo_client_id',
            client_secret: process.env.TIKTOK_CLIENT_SECRET || 'demo_client_secret',
            code,
            grant_type: 'authorization_code',
            redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/callback/tiktok`
          })
        });

        if (!tokenResponse.ok) {
          console.error('Failed to exchange code for token:', await tokenResponse.text());
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?oauth_error=token_exchange_failed`
          );
        }

        // Clean up state
        global.oauthStates.delete(state);

        // For production, store tokens securely and redirect to success page
        const successParams = new URLSearchParams({
          platform: 'tiktok',
          status: 'success',
          message: 'Successfully connected to TikTok Shop!'
        });

        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?${successParams.toString()}`
        );

      } catch (error) {
        console.error('TikTok OAuth callback error:', error);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?oauth_error=callback_error`
        );
      }
    }
