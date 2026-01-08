/**
 * Authentication Middleware
 *
 * Verifies the Supabase JWT from the Authorization header
 * and attaches user info to the request.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/supabaseServer';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
      };
    }
  }
}

/**
 * Middleware that requires a valid Supabase auth token
 * Sets req.user if valid, returns 401 if not
 */
export async function requireSupabaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    console.log('[requireSupabaseAuth] Checking auth for:', req.method, req.path);
    console.log('[requireSupabaseAuth] Authorization header present:', !!authHeader);

    if (!authHeader) {
      console.log('[requireSupabaseAuth] Missing Authorization header');
      res.status(401).json({
        status: 'error',
        message: 'Missing Authorization Bearer token',
        hint: 'Include Authorization: Bearer <token> header',
      });
      return;
    }

    // Extract token from "Bearer <token>" format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.log('[requireSupabaseAuth] Invalid format:', parts[0]);
      res.status(401).json({
        status: 'error',
        message: 'Invalid authorization format',
        hint: 'Use format: Bearer <token>',
      });
      return;
    }

    const token = parts[1];
    console.log('[requireSupabaseAuth] Token received, length:', token.length);

    // Verify token and get user
    const user = await verifyToken(token);

    if (!user) {
      console.log('[requireSupabaseAuth] Token verification failed');
      res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token',
        hint: 'Token may be expired or malformed. Please log in again.',
      });
      return;
    }

    console.log('[requireSupabaseAuth] Auth successful for user:', user.id);

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    console.error('[requireSupabaseAuth] Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Authentication error',
      hint: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Optional auth middleware - attaches user if token present, but doesn't require it
 */
export async function optionalSupabaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const user = await verifyToken(parts[1]);
        if (user) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth
    next();
  }
}
