import type { Express } from 'express';
import express from 'express';
import crypto from 'crypto';
import { storage } from './storage';

// Extend Express session type
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      name: string;
      merchantId: string;
      accessToken: string;
    };
  }
}

interface CloverTokenResponse {
  access_token: string;
  token_type: string;
  merchant_id?: string;
}

// PKCE store for OAuth2 security
const pkceStore = new Map<string, { codeVerifier: string; codeChallenge: string }>();

export function setupCloverAuth(app: Express) {
  // Clover OAuth initiation with PKCE
  app.get('/api/auth/clover', (req, res) => {
    const state = crypto.randomBytes(32).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    // Store PKCE data for later verification
    pkceStore.set(state, { codeVerifier, codeChallenge });

    // Use correct Clover authorization endpoints per official docs
    const authUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.clover.com/oauth/v2/authorize'
      : 'https://apisandbox.dev.clover.com/oauth/v2/authorize';
    
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/clover/callback`;
    
    const url = new URL(authUrl);
    url.searchParams.set('client_id', process.env.CLOVER_APP_ID!);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    console.log('=== CLOVER OAUTH2 PKCE INITIATION ===');
    console.log('Auth URL:', url.toString());
    console.log('Client ID:', process.env.CLOVER_APP_ID);
    console.log('Redirect URI:', redirectUri);
    console.log('State:', state);
    console.log('Code Challenge Method: S256');
    console.log('=====================================');
    
    res.redirect(url.toString());
  });

  // Clover OAuth callback - OAuth2 only
  app.get('/api/auth/clover/callback', async (req, res) => {
    const { code, merchant_id, state, error } = req.query;

    console.log('=== CLOVER OAUTH CALLBACK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Full callback URL:', req.url);
    console.log('Query parameters received:', req.query);
    console.log('Headers:', req.headers);
    
    // Only support OAuth2 flow - code parameter is required
    console.log('OAuth2 Flow Parameters:', {
      hasCode: !!code,
      hasState: !!state,
      hasMerchantId: !!merchant_id,
      merchant_id,
      code: code ? 'PRESENT' : 'MISSING'
    });
    console.log('=====================================');

    if (error) {
      console.error('Clover OAuth error:', error);
      return res.redirect('/?error=oauth_error');
    }

    // OAuth2 flow validation
    if (!code) {
      console.error('Missing authorization code - OAuth2 flow required');
      return res.redirect('/?error=missing_code');
    }
    
    if (!merchant_id) {
      console.error('Missing merchant ID in OAuth2 callback');
      return res.redirect('/?error=missing_merchant_id');
    }

    console.log('Proceeding with OAuth2 token exchange...');

    // Exchange authorization code for access token using correct Clover endpoints
    const tokenUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.clover.com/oauth/v2/token' 
      : 'https://apisandbox.dev.clover.com/oauth/v2/token';

    try {
      console.log('=== TOKEN EXCHANGE WITH PKCE ===');
      console.log('Token URL:', tokenUrl);
      console.log('Authorization Code:', code ? 'PRESENT' : 'MISSING');
      console.log('State:', state);
      
      // Get PKCE data - state is required for PKCE
      if (!state) {
        console.error('Missing state parameter - required for PKCE flow');
        return res.redirect('/?error=missing_state');
      }
      
      const pkceData = pkceStore.get(state as string);
      if (!pkceData?.codeVerifier) {
        console.error('Missing or invalid PKCE data for state:', state);
        return res.redirect('/?error=invalid_pkce_state');
      }

      // Prepare token request body as JSON (per Clover docs)
      const tokenRequestBody = {
        client_id: process.env.CLOVER_APP_ID!,
        code: code as string,
        code_verifier: pkceData.codeVerifier,
      };

      console.log('Token request body:', {
        ...tokenRequestBody,
        code: 'PRESENT',
        code_verifier: 'PRESENT'
      });

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenRequestBody),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('=== TOKEN EXCHANGE FAILED ===');
        console.error('HTTP Status:', tokenResponse.status);
        console.error('Response:', errorText);
        console.error('Token URL used:', tokenUrl);
        console.error('Request body:', {
          client_id: 'PRESENT',
          code: 'PRESENT',
          code_verifier: 'PRESENT'
        });
        console.error('=============================');
        return res.redirect('/?error=token_exchange_failed');
      }

      const tokenData = await tokenResponse.json();
      console.log('Token exchange successful!');
      console.log('Access token received:', tokenData.access_token ? 'YES' : 'NO');

      // Get merchant info using the access token - use correct API base URL
      const apiBaseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://api.clover.com' 
        : 'https://apisandbox.dev.clover.com';
      
      const merchantResponse = await fetch(`${apiBaseUrl}/v3/merchants/${merchant_id}`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      let merchantData;
      if (merchantResponse.ok) {
        merchantData = await merchantResponse.json();
        console.log('Merchant info retrieved:', merchantData.name || 'Unknown name');
      } else {
        console.warn('Could not fetch merchant info, using defaults');
        merchantData = { name: `Merchant ${merchant_id}` };
      }

      // Create or update user
      const userId = `clover-${merchant_id}`;
      const userData = await storage.upsertUser({
        id: userId,
        email: `merchant-${merchant_id}@clover.com`,
        firstName: 'Clover',
        lastName: 'Merchant',
        profileImageUrl: null,
      });

      // Create or update restaurant with access token
      const restaurant = await storage.upsertRestaurant({
        name: merchantData.name || `Merchant ${merchant_id}`,
        location: merchantData.address?.address1 || 'Unknown',
        cloverMerchantId: merchant_id as string,
        cloverAccessToken: tokenData.access_token,
      });

      // Create user-restaurant relationship
      await storage.addUserToRestaurant({
        userId: userData.id,
        restaurantId: restaurant.id,
        role: 'owner',
      });

      // Set session
      req.session.user = {
        id: userData.id,
        email: userData.email || '',
        name: `${userData.firstName || 'Clover'} ${userData.lastName || 'Merchant'}`,
        merchantId: merchant_id as string,
        accessToken: tokenData.access_token,
      };

      // Clean up PKCE data - always cleanup since state is required
      pkceStore.delete(state as string);

      console.log('OAuth2 flow completed successfully for merchant:', merchant_id);
      res.redirect('/');
    } catch (error) {
      console.error('Token exchange error:', error);
      res.redirect('/?error=token_exchange_failed');
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  // Get current user
  app.get('/api/auth/user', async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const restaurants = await storage.getUserRestaurants(req.session.user.id);
      
      res.json({
        ...user,
        restaurants,
        merchantId: req.session.user.merchantId
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // OAuth status checker
  app.get('/api/auth/clover/status', (req, res) => {
    const user = req.session.user;
    const isAuthenticated = !!user;
    const hasCloverAccess = isAuthenticated && !!user?.accessToken;
    
    res.json({
      authenticated: isAuthenticated,
      cloverConnected: hasCloverAccess,
      user: user ? {
        id: user.id,
        email: user.email,
        merchantId: user.merchantId,
        hasAccessToken: !!user.accessToken
      } : null,
      message: !isAuthenticated 
        ? 'Not authenticated with Clover' 
        : !hasCloverAccess 
          ? 'Authenticated but no Clover access token'
          : 'Successfully connected to Clover',
      nextStep: !isAuthenticated 
        ? 'Visit /api/auth/clover to start OAuth2 flow'
        : !hasCloverAccess
          ? 'Complete Clover authorization to get access token'
          : 'Ready to use Clover API'
    });
  });

  // Test endpoint to demonstrate OAuth2 PKCE flow
  app.get('/api/auth/clover/test-flow', (req, res) => {
    res.json({
      message: 'Clover OAuth2 PKCE Flow Implementation',
      implementation: 'According to official Clover documentation',
      documentation: 'https://docs.clover.com/dev/docs/oauth-flow-for-low-trust-apps-pkce',
      endpoints: {
        sandbox: {
          authorization: 'https://apisandbox.dev.clover.com/oauth/v2/authorize',
          token: 'https://apisandbox.dev.clover.com/oauth/v2/token',
          api: 'https://apisandbox.dev.clover.com'
        },
        production: {
          authorization: 'https://www.clover.com/oauth/v2/authorize',
          token: 'https://www.clover.com/oauth/v2/token',
          api: 'https://api.clover.com'
        }
      },
      flowSteps: [
        '1. Generate PKCE code_verifier and code_challenge (S256)',
        '2. Redirect merchant to authorization URL with PKCE parameters',
        '3. Merchant authorizes and returns with authorization code',
        '4. Exchange code for access token using PKCE code_verifier',
        '5. Store access token and use for API calls'
      ],
      features: [
        'Full PKCE security implementation',
        'Expiring access tokens with refresh capability',
        'Merchant-specific token storage',
        'Proper JSON request format',
        'State parameter validation'
      ],
      testFlow: {
        step1: 'Visit /api/auth/clover to start OAuth2 flow',
        step2: 'Authorize on Clover sandbox',
        step3: 'Return to callback with authorization code',
        step4: 'Token exchange with PKCE verification'
      }
    });
  });
}

// Middleware to check authentication
export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}