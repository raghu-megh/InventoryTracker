import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Express, Request, Response, NextFunction } from "express";

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    // For development, we'll use the Firebase emulator or rely on environment credentials
    // In production, you would use a service account key
    try {
      initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'your-project-id',
      });
    } catch (error) {
      console.warn('Firebase Admin initialization failed:', error);
    }
  }
};

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
  };
}

export const firebaseAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No auth header provided, headers:', Object.keys(req.headers));
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('Processing token:', token.substring(0, 20) + '...');
    
    // Initialize Firebase Admin if not already done
    initializeFirebaseAdmin();
    
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    console.log('Token verified for user:', decodedToken.uid);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.display_name,
    };
    
    next();
  } catch (error) {
    console.error('Firebase auth error:', error);
    console.error('Firebase auth error:', error);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

// For development - simple middleware that doesn't require Firebase Admin
export const devAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // In development, we'll extract user info from headers sent by the frontend
  const userId = req.headers['x-user-id'] as string;
  const userEmail = req.headers['x-user-email'] as string;
  const userName = req.headers['x-user-name'] as string;
  
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: No user ID provided' });
  }
  
  req.user = {
    uid: userId,
    email: userEmail,
    name: userName,
  };
  
  next();
};

// Use Firebase authentication middleware in all environments
export const isAuthenticated = firebaseAuthMiddleware;