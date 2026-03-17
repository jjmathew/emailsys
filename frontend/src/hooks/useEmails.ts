import { useState, useCallback } from 'react';
import { Email, BoardColumn } from '../types';
import { fetchEmails } from '../utils/api';
import { organizeEmailsIntoColumns } from '../utils/emailUtils';

export function useEmails() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEmails = useCallback(async (maxResults = 30) => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchEmails(maxResults);
      setEmails(fetched);
      setColumns(organizeEmailsIntoColumns(fetched));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, []);

  const moveEmail = useCallback((emailId: string, targetCategory: string, dueDate?: string | null) => {
    setEmails((prev) => {
      const updated = prev.map((email) => {
        if (email.id === emailId) {
          return {
            ...email,
            analysis: email.analysis
              ? { ...email.analysis, category: targetCategory as any, dueDate: dueDate !== undefined ? dueDate : email.analysis.dueDate }
              : { emailId, category: targetCategory as any, priority: 'Medium' as any, actionTag: 'Needs Response' as any, suggestion: '', dueDate: dueDate ?? null, reasoning: '' },
          };
        }
        return email;
      });
      setColumns(organizeEmailsIntoColumns(updated));
      return updated;
    });
  }, []);

  const removeEmail = useCallback((emailId: string) => {
    setEmails((prev) => {
      const updated = prev.filter((e) => e.id !== emailId);
      setColumns(organizeEmailsIntoColumns(updated));
      return updated;
    });
  }, []);

  const addEmail = useCallback((email: Email) => {
    setEmails((prev) => {
      const updated = [email, ...prev];
      setColumns(organizeEmailsIntoColumns(updated));
      return updated;
    });
  }, []);

  return { emails, columns, loading, error, loadEmails, moveEmail, removeEmail, addEmail };
}
