import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { analyzeEmail, generateReply, summarizeEmail } from '../services/ai';

const router = Router();

router.post('/analyze', requireAuth, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email data required' });
    }
    const analysis = await analyzeEmail(email);
    return res.json({ analysis });
  } catch (error: any) {
    console.error('Error analyzing email:', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze email' });
  }
});

router.post('/reply', requireAuth, async (req: Request, res: Response) => {
  try {
    const { email, instructions } = req.body;
    if (!email || !instructions) {
      return res.status(400).json({ error: 'Email and instructions required' });
    }
    const reply = await generateReply(email, instructions);
    return res.json({ reply });
  } catch (error: any) {
    console.error('Error generating reply:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate reply' });
  }
});

router.post('/summarize', requireAuth, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email data required' });
    }
    const summary = await summarizeEmail(email);
    return res.json({ summary });
  } catch (error: any) {
    console.error('Error summarizing email:', error);
    return res.status(500).json({ error: error.message || 'Failed to summarize email' });
  }
});

export default router;
