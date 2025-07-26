import type { Express } from 'express';
import express from 'express';
import crypto from 'crypto';
import { storage } from './storage';

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

    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.clover.com' 
      : 'https://sandbox.dev.clover.com';
    
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/clover/callback`;
    
    const authUrl = new URL('/oauth/v2/authorize', baseUrl);
    authUrl.searchParams.set('client_id', process.env.CLOVER_APP_ID!);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    console.log('Redirecting to Clover OAuth:', authUrl.toString());
    res.redirect(authUrl.toString());
  });

  // Clover OAuth callback - OAuth2 only
  app.get('/api/auth/clover/callback', async (req, res) => {
    const { code, merchant_id, state, error } = req.query;

    console.log('=== CLOVER OAUTH CALLBACK DEBUG ===');
    console.log('Full callback URL:', req.url);
    console.log('Query parameters received:', req.query);
    
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

    // Exchange authorization code for access token
    const tokenUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api.clover.com/oauth/v2/token' 
      : 'https://apisandbox.dev.clover.com/oauth/v2/token';

    try {
      console.log('Exchanging authorization code for access token...');
      console.log('Token URL:', tokenUrl);
      
      // For OAuth2 flow, use PKCE if state is available, otherwise use basic flow
      let tokenRequestBody: any = {
        client_id: process.env.CLOVER_APP_ID!,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: `${req.protocol}://${req.get('host')}/api/auth/clover/callback`,
      };

      // Add PKCE verification if state parameter exists
      if (state) {
        const pkceData = pkceStore.get(state as string);
        if (pkceData?.codeVerifier) {
          tokenRequestBody.code_verifier = pkceData.codeVerifier;
          console.log('Using PKCE verification');
        }
      }

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequestBody),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('=== TOKEN EXCHANGE FAILED ===');
        console.error('HTTP Status:', tokenResponse.status);
        console.error('Response:', errorText);
        console.error('Token URL used:', tokenUrl);
        console.error('Request body:', {
          ...tokenRequestBody,
          code: 'PRESENT',
          code_verifier: tokenRequestBody.code_verifier ? 'PRESENT' : 'NOT_USED'
        });
        console.error('=============================');
        return res.redirect('/?error=token_exchange_failed');
      }

      const tokenData = await tokenResponse.json();
      console.log('Token exchange successful!');
      console.log('Access token received:', tokenData.access_token ? 'YES' : 'NO');

      // Get merchant info using the access token
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

      // Clean up PKCE data if used
      if (state) {
        pkceStore.delete(state as string);
      }

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
}

// Middleware to check authentication
export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}