import { Request, Response, NextFunction } from 'express';
import { createOAuth2Client } from '../services/gmail';
import { OAuth2Client } from 'google-auth-library';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const tokens = (req.session as any).tokens;

  if (!tokens) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  (req as any).oauth2Client = oauth2Client as OAuth2Client;
  (req as any).userId = (req.session as any).userProfile?.email ?? 'unknown';

  next();
}
