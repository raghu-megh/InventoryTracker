import express from 'express';
import crypto from 'crypto';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { storage } from './storage';

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
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store PKCE parameters
    pkceStore.set(state, { codeVerifier, state });
    
    const authUrl = new URL('https://sandbox.dev.clover.com/oauth/authorize');
    authUrl.searchParams.set('client_id', process.env.CLOVER_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', process.env.CLOVER_REDIRECT_URI!);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    
    res.redirect(authUrl.toString());
  });

  // Handle OAuth callback
  app.get('/api/auth/clover/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      console.error('Clover OAuth error:', error);
      return res.redirect('/?error=oauth_error');
    }

    if (!code || !state) {
      return res.redirect('/?error=missing_parameters');
    }

    // Retrieve PKCE parameters
    const pkceData = pkceStore.get(state as string);
    if (!pkceData) {
      return res.redirect('/?error=invalid_state');
    }

    try {
      // Exchange code for token
      const tokenResponse = await fetch('https://sandbox.dev.clover.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.CLOVER_CLIENT_ID!,
          code: code as string,
          code_verifier: pkceData.codeVerifier,
          grant_type: 'authorization_code',
          redirect_uri: process.env.CLOVER_REDIRECT_URI!,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        return res.redirect('/?error=token_exchange_failed');
      }

      const tokenData: CloverTokenResponse = await tokenResponse.json();

      // Get user info from Clover
      const userResponse = await fetch(`https://sandbox.dev.clover.com/v3/merchants/${tokenData.merchant_id}/employees/current`, {
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
      const merchantResponse = await fetch(`https://sandbox.dev.clover.com/v3/merchants/${tokenData.merchant_id}`, {
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
        id: tokenData.merchant_id,
        name: merchantData.name,
        cloverMerchantId: tokenData.merchant_id,
        cloverAccessToken: tokenData.access_token,
        ownerId: userData.id,
      });

      // Create user-restaurant relationship
      await storage.createUserRestaurant({
        userId: userData.id,
        restaurantId: tokenData.merchant_id,
        role: 'owner',
      });

      // Set session
      req.session.user = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        merchantId: tokenData.merchant_id,
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
}

// Middleware to check authentication
export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}