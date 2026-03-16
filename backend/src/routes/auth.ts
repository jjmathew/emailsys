import { Router, Request, Response } from 'express';
import { createOAuth2Client, getAuthUrl, getUserProfile } from '../services/gmail';

const router = Router();

router.get('/google', (_req: Request, res: Response) => {
  const oauth2Client = createOAuth2Client();
  const authUrl = getAuthUrl(oauth2Client);
  res.json({ url: authUrl });
});

router.get('/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=no_code`);
  }

  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const profile = await getUserProfile(oauth2Client);

    (req.session as any).tokens = tokens;
    (req.session as any).userProfile = profile;

    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?auth=success`);
  } catch (error) {
    console.error('Auth callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed`);
  }
});

router.get('/status', (req: Request, res: Response) => {
  const tokens = (req.session as any).tokens;
  const userProfile = (req.session as any).userProfile;

  if (tokens) {
    res.json({ authenticated: true, user: userProfile });
  } else {
    res.json({ authenticated: false });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

export default router;
