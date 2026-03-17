import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { fetchEmails, sendEmail, markAsRead, archiveEmail, trashEmail, reportSpam } from '../services/gmail';
import { generateReply } from '../services/ai';
import { getBulkEmailMetadata, upsertEmailMetadata, deleteEmailMetadata } from '../services/database';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const maxResults = parseInt(req.query.maxResults as string) || 30;
    const oauth2Client = (req as any).oauth2Client;
    const userId: string = (req as any).userId;

    const emails = await fetchEmails(oauth2Client, maxResults);
    const metaMap = getBulkEmailMetadata(userId);

    const enrichedEmails = emails.map((email) => {
      const meta = metaMap.get(email.id);
      return {
        ...email,
        analysis: meta
          ? {
              emailId: email.id,
              category: meta.category,
              priority: meta.priority ?? 'Medium',
              actionTag: 'Needs Response',
              suggestion: '',
              dueDate: meta.dueDate,
              reasoning: '',
            }
          : null,
      };
    });

    res.json({ emails: enrichedEmails });
  } catch (error: any) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch emails' });
  }
});

router.post('/:id/metadata', requireAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId: string = (req as any).userId;
    const { category, priority, dueDate } = req.body;

    upsertEmailMetadata(userId, id, { category, priority, dueDate });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving metadata:', error);
    res.status(500).json({ error: error.message || 'Failed to save metadata' });
  }
});

router.post('/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const { to, subject, body, threadId } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    }

    const oauth2Client = (req as any).oauth2Client;
    await sendEmail(oauth2Client, to, subject, body, threadId);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

router.post('/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const oauth2Client = (req as any).oauth2Client;
    await markAsRead(oauth2Client, id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking as read:', error);
    res.status(500).json({ error: error.message || 'Failed to mark as read' });
  }
});

router.post('/:id/archive', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId: string = (req as any).userId;
    const oauth2Client = (req as any).oauth2Client;
    await archiveEmail(oauth2Client, id);
    deleteEmailMetadata(userId, id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to archive email' });
  }
});

router.post('/:id/trash', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId: string = (req as any).userId;
    const oauth2Client = (req as any).oauth2Client;
    await trashEmail(oauth2Client, id);
    deleteEmailMetadata(userId, id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete email' });
  }
});

router.post('/:id/spam', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId: string = (req as any).userId;
    const oauth2Client = (req as any).oauth2Client;
    await reportSpam(oauth2Client, id);
    deleteEmailMetadata(userId, id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to report spam' });
  }
});

router.post('/:id/reply', requireAuth, async (req: Request, res: Response) => {
  try {
    const { instructions, email } = req.body;

    if (!instructions || !email) {
      return res.status(400).json({ error: 'Missing required fields: instructions, email' });
    }

    const reply = await generateReply(email, instructions);
    return res.json({ reply });
  } catch (error: any) {
    console.error('Error generating reply:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate reply' });
  }
});

export default router;
