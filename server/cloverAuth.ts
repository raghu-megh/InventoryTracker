import express from 'express';
import crypto from 'crypto';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { storage } from './storage';

// Extend session data interface
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
  merchant_id: string;
  employee_id?: string;
}

interface CloverUserInfo {
  id: string;
  email: string;
  name: string;
  merchant: {
    id: string;
    name: string;
  };
}

// PKCE helper functions
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Store PKCE state temporarily (in production, use Redis or database)
const pkceStore = new Map<string, { codeVerifier: string; state: string }>();

export function setupCloverAuth(app: express.Application) {
  // Check for required environment variables
  if (!process.env.CLOVER_APP_ID) {
    console.warn('CLOVER_APP_ID not set - Clover OAuth will not work');
  }
  if (!process.env.CLOVER_APP_SECRET) {
    console.warn('CLOVER_APP_SECRET not set - Clover OAuth will not work');
  }
  // Set up session middleware first
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || 'clover-oauth-secret-key-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  }));
  // Initiate OAuth flow
  app.get('/api/auth/clover', (req, res) => {
    if (!process.env.CLOVER_APP_ID) {
      return res.status(500).json({ 
        error: 'Clover OAuth not configured. Please set CLOVER_APP_ID and CLOVER_APP_SECRET environment variables.' 
      });
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store PKCE parameters
    pkceStore.set(state, { codeVerifier, state });
    
    // Use the correct Clover v2/OAuth URLs for development
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.clover.com/oauth/v2/authorize' 
      : 'https://sandbox.dev.clover.com/oauth/v2/authorize';
    
    const authUrl = new URL(baseUrl);
    authUrl.searchParams.set('client_id', process.env.CLOVER_APP_ID);
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/clover/callback`;
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    
    res.redirect(authUrl.toString());
  });

  // Handle OAuth callback - supports both legacy and v2/OAuth flows
  app.get('/api/auth/clover/callback', async (req, res) => {
    const { code, state, error, merchant_id, employee_id, client_id } = req.query;
    
    console.log('=== CLOVER OAUTH CALLBACK DEBUG ===');
    console.log('Full callback URL:', req.url);
    console.log('Query parameters received:', req.query);
    
    // Detect OAuth flow type
    const isLegacyFlow = !code && merchant_id && employee_id && client_id;
    const isV2Flow = code && merchant_id;  // v2 flow may not always have state in mixed scenarios
    const isMixedFlow = code && merchant_id && employee_id && client_id; // Has both legacy and v2 params
    
    console.log('OAuth Flow Detection:', {
      legacyFlow: isLegacyFlow,
      v2Flow: isV2Flow,
      mixedFlow: isMixedFlow,
      hasCode: !!code,
      hasState: !!state,
      hasEmployeeId: !!employee_id,
      merchant_id,
      client_id
    });
    console.log('=====================================');

    if (error) {
      console.error('Clover OAuth error:', error);
      return res.redirect('/?error=oauth_error');
    }

    // Handle mixed flow or legacy OAuth flow (pre-October 2023 apps with modern callback)
    if (isLegacyFlow || isMixedFlow) {
      console.log('Processing legacy/mixed OAuth flow...');
      try {
        // For legacy flow, we get merchant data directly from callback
        const merchantId = merchant_id as string;
        const employeeId = employee_id as string;
        
        // Get merchant info using the provided merchant_id
        const apiBaseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://api.clover.com' 
          : 'https://apisandbox.dev.clover.com';
        
        // Note: Legacy flow requires getting access token through different method
        // For now, we'll create the session without token exchange
        
        // Create or get user (simplified for legacy flow)
        const userData = await storage.upsertUser({
          id: employeeId,
          email: `employee-${employeeId}@merchant-${merchantId}.clover`,
          firstName: 'Clover',
          lastName: 'Employee',
          profileImageUrl: null,
        });

        // Check if restaurant already exists by cloverMerchantId
        let restaurant = await storage.getRestaurantByCloverMerchantId(merchantId);
        if (!restaurant) {
          // Create new restaurant with UUID
          const restaurantId = crypto.randomUUID();
          const restaurantData = {
            id: restaurantId,
            name: `Merchant ${merchantId}`,
            location: 'Unknown', // Default location for legacy OAuth
            cloverMerchantId: merchantId,
            // Remove cloverAccessToken and ownerId as they're not in the schema
          };
          console.log('Creating restaurant with data:', restaurantData);
          restaurant = await storage.upsertRestaurant(restaurantData);
        }

        // Create user-restaurant relationship if not exists
        try {
          await storage.createUserRestaurant({
            userId: userData.id,
            restaurantId: restaurant.id,
            role: 'owner',
          });
        } catch (error) {
          // Ignore if relationship already exists
          console.log('User-restaurant relationship may already exist');
        }

        // Set session
        req.session.user = {
          id: userData.id,
          email: userData.email || '',
          name: `${userData.firstName || 'Clover'} ${userData.lastName || 'Employee'}`,
          merchantId: merchantId,
          accessToken: '', // Legacy flow requires separate token setup
        };

        console.log('Legacy OAuth flow completed successfully');
        return res.redirect('/');
      } catch (error) {
        console.error('Legacy OAuth callback error:', error);
        return res.redirect('/?error=legacy_oauth_error');
      }
    }

    // Handle v2/OAuth flow (only if not already handled by legacy/mixed flow)
    if (isV2Flow && !isMixedFlow && !isLegacyFlow) {
      if (!code) {
        console.error('Missing authorization code in v2/OAuth callback');
        return res.redirect('/?error=missing_code');
      }
      
      if (!state) {
        console.error('Missing state parameter in v2/OAuth callback');
        return res.redirect('/?error=missing_state');
      }
    }

    // Retrieve PKCE parameters
    const pkceData = pkceStore.get(state as string);
    if (!pkceData) {
      return res.redirect('/?error=invalid_state');
    }

    try {
      // Exchange code for token using v2/OAuth endpoint
      const tokenUrl = process.env.NODE_ENV === 'production' 
        ? 'https://api.clover.com/oauth/v2/token' 
        : 'https://apisandbox.dev.clover.com/oauth/v2/token';
      
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.CLOVER_APP_ID!,
          client_secret: process.env.CLOVER_APP_SECRET!,
          code: code as string,
          code_verifier: pkceData.codeVerifier,
          grant_type: 'authorization_code',
          redirect_uri: `${req.protocol}://${req.get('host')}/api/auth/clover/callback`,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('=== TOKEN EXCHANGE FAILED ===');
        console.error('HTTP Status:', tokenResponse.status);
        console.error('Response:', errorText);
        console.error('Token URL used:', tokenUrl);
        console.error('Request body:', {
          client_id: process.env.CLOVER_APP_ID,
          code: 'PRESENT',
          grant_type: 'authorization_code',
          redirect_uri: `${req.protocol}://${req.get('host')}/api/auth/clover/callback`
        });
        console.error('=============================');
        return res.redirect('/?error=token_exchange_failed');
      }

      const tokenData: CloverTokenResponse = await tokenResponse.json();

      // Use merchant_id from callback or from token response
      const merchantId = merchant_id || tokenData.merchant_id;
      console.log('Using merchant ID:', merchantId);
      
      // Get user info from Clover
      const apiBaseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://api.clover.com' 
        : 'https://apisandbox.dev.clover.com';
      
      const userResponse = await fetch(`${apiBaseUrl}/v3/merchants/${merchantId}/employees/current`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      });

      if (!userResponse.ok) {
        console.error('Failed to get user info from Clover');
        return res.redirect('/?error=user_info_failed');
      }

      const userData = await userResponse.json();

      // Get merchant info
      const merchantResponse = await fetch(`${apiBaseUrl}/v3/merchants/${merchantId}`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      });

      const merchantData = merchantResponse.ok ? await merchantResponse.json() : { name: 'Unknown Merchant' };

      // Create or update user in our database
      const user = await storage.upsertUser({
        id: userData.id,
        email: userData.email || '',
        firstName: userData.name?.split(' ')[0] || '',
        lastName: userData.name?.split(' ').slice(1).join(' ') || '',
        profileImageUrl: null,
      });

      // Create or update restaurant
      await storage.upsertRestaurant({
        id: merchantId,
        name: merchantData.name,
        cloverMerchantId: merchantId,
        cloverAccessToken: tokenData.access_token,
        ownerId: userData.id,
      });

      // Create user-restaurant relationship
      await storage.createUserRestaurant({
        userId: userData.id,
        restaurantId: merchantId,
        role: 'owner',
      });

      // Set session
      req.session.user = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        merchantId: merchantId as string,
        accessToken: tokenData.access_token,
      };

      // Clean up PKCE store
      pkceStore.delete(state as string);

      res.redirect('/');
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/?error=server_error');
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
    if (!req.session.user) {
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
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // Test endpoint to demonstrate Clover callback format
  app.get('/api/auth/clover/test-callback', async (req, res) => {
    res.json({
      message: 'Clover OAuth callback format documentation',
      callbackUrl: '/api/auth/clover/callback',
      expectedParameters: {
        code: 'AUTHORIZATION_CODE from Clover',
        merchant_id: 'MERCHANT_ID from Clover',
        state: 'STATE parameter for CSRF protection'
      },
      exampleCallback: 'https://your-app.replit.app/api/auth/clover/callback?code=abc123xyz&merchant_id=QTQG5J1TGM7Z1&state=generated-state-value',
      currentConfig: {
        clientId: process.env.CLOVER_APP_ID,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        oauthUrl: process.env.NODE_ENV === 'production' 
          ? 'https://www.clover.com/oauth/v2/authorize'
          : 'https://sandbox.dev.clover.com/oauth/v2/authorize'
      }
    });
  });
}

// Middleware to check authentication
export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}