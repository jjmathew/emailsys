import axios from 'axios';
import { Email } from '../types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export async function checkAuthStatus(): Promise<{ authenticated: boolean; user?: { email: string; name: string; picture: string } }> {
  const response = await api.get('/auth/status');
  return response.data;
}

export async function getGoogleAuthUrl(): Promise<string> {
  const response = await api.get('/auth/google');
  return response.data.url;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function fetchEmails(maxResults = 30): Promise<Email[]> {
  const response = await api.get(`/emails?maxResults=${maxResults}`);
  return response.data.emails;
}

export async function sendEmail(data: { to: string; subject: string; body: string; threadId?: string }): Promise<void> {
  await api.post('/emails/send', data);
}

export async function markEmailRead(id: string): Promise<void> {
  await api.post(`/emails/${id}/read`);
}

export async function generateReply(email: Email, instructions: string): Promise<string> {
  const response = await api.post('/ai/reply', { email, instructions });
  return response.data.reply;
}

export async function summarizeEmail(email: Email): Promise<string> {
  const response = await api.post('/ai/summarize', { email });
  return response.data.summary;
}

export default api;
