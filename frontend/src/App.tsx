import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { LoginPage } from './pages/LoginPage';
import { BoardPage } from './pages/BoardPage';
import { User } from './types';
import { checkAuthStatus, logout } from './utils/api';

type AppState = 'loading' | 'unauthenticated' | 'authenticated';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuth();

    // Handle OAuth callback params
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      window.history.replaceState({}, '', '/');
      checkAuth();
    } else if (params.get('error')) {
      window.history.replaceState({}, '', '/');
      setAppState('unauthenticated');
    }
  }, []);

  async function checkAuth() {
    try {
      const status = await checkAuthStatus();
      if (status.authenticated && status.user) {
        setUser(status.user as User);
        setAppState('authenticated');
      } else {
        setAppState('unauthenticated');
      }
    } catch {
      setAppState('unauthenticated');
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setUser(null);
      setAppState('unauthenticated');
    }
  }

  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      {appState === 'unauthenticated' ? (
        <LoginPage />
      ) : (
        <BoardPage user={user!} onLogout={handleLogout} />
      )}
    </>
  );
}
