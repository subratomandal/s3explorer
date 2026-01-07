import { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import { rateLimits } from '../services/db.js';

// Password from ENV (required)
const APP_PASSWORD = process.env.APP_PASSWORD;

if (!APP_PASSWORD) {
  console.error('FATAL: APP_PASSWORD environment variable is required');
  process.exit(1);
}

// Validate password strength
function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (password.length < 12) {
    return { valid: false, reason: 'Password must be at least 12 characters' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain lowercase letter' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain number' };
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain special character' };
  }
  return { valid: true };
}

const passwordCheck = validatePasswordStrength(APP_PASSWORD);
if (!passwordCheck.valid) {
  console.error(`FATAL: ${passwordCheck.reason}`);
  process.exit(1);
}

// Rate limiting config
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10; // 10 attempts per 15 min
const BLOCK_DURATION = 30 * 60 * 1000; // 30 min block after exceeding

interface RateLimitRecord {
  ip: string;
  attempts: number;
  first_attempt: number;
  blocked_until: number | null;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimits.get(ip) as RateLimitRecord | undefined;

  if (!record) {
    return { allowed: true };
  }

  // Check if blocked
  if (record.blocked_until && record.blocked_until > now) {
    return { allowed: false, retryAfter: Math.ceil((record.blocked_until - now) / 1000) };
  }

  // Check if window expired, reset if so
  if (now - record.first_attempt > RATE_LIMIT_WINDOW) {
    rateLimits.reset(ip);
    return { allowed: true };
  }

  // Check attempts in window
  if (record.attempts >= MAX_ATTEMPTS) {
    const blockedUntil = now + BLOCK_DURATION;
    rateLimits.upsert(ip, record.attempts, record.first_attempt, blockedUntil, record.attempts, record.first_attempt, blockedUntil);
    return { allowed: false, retryAfter: Math.ceil(BLOCK_DURATION / 1000) };
  }

  return { allowed: true };
}

function recordAttempt(ip: string): void {
  const now = Date.now();
  const record = rateLimits.get(ip) as RateLimitRecord | undefined;

  if (!record || now - record.first_attempt > RATE_LIMIT_WINDOW) {
    rateLimits.upsert(ip, 1, now, null, 1, now, null);
  } else {
    rateLimits.upsert(ip, record.attempts + 1, record.first_attempt, null, record.attempts + 1, record.first_attempt, null);
  }
}

function resetAttempts(ip: string): void {
  rateLimits.reset(ip);
}

// Hash password at startup
let passwordHash: string = '';
(async () => {
  passwordHash = await argon2.hash(APP_PASSWORD as string);
})();

export async function login(req: Request, res: Response): Promise<void> {
  const ip = getClientIp(req);
  
  // Check rate limit
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    res.status(429).json({ 
      error: 'Too many login attempts',
      retryAfter: rateCheck.retryAfter 
    });
    return;
  }

  const { password, rememberMe } = req.body;

  if (!password) {
    recordAttempt(ip);
    res.status(400).json({ error: 'Password required' });
    return;
  }

  try {
    const valid = await argon2.verify(passwordHash, password);
    
    if (!valid) {
      recordAttempt(ip);
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    // Success - reset rate limit and create session
    resetAttempts(ip);
    
    req.session.authenticated = true;
    req.session.loginTime = Date.now();
    
    // Set session duration based on rememberMe
    if (rememberMe) {
      req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1 day
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
}

export function logout(req: Request, res: Response): void {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Logout failed' });
      return;
    }
    res.clearCookie('sid');
    res.json({ success: true });
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

export function getAuthStatus(req: Request, res: Response): void {
  res.json({
    authenticated: !!req.session?.authenticated,
    loginTime: req.session?.loginTime || null,
  });
}

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    authenticated: boolean;
    loginTime: number;
  }
}
