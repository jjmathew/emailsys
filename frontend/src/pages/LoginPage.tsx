import React, { useState } from 'react';
import { Mail, Sparkles, Shield, Zap } from 'lucide-react';
import { getGoogleAuthUrl } from '../utils/api';

export function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-2xl shadow-lg mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Email Assistant</h1>
          <p className="text-gray-500 mt-2">Your AI-powered Gmail board</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: Sparkles, label: 'AI Suggestions', desc: 'Smart action recommendations' },
            { icon: Zap, label: 'Trello Board', desc: 'Visual email management' },
            { icon: Shield, label: 'Secure', desc: 'OAuth2 Gmail integration' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
              <Icon className="w-5 h-5 text-brand-500 mx-auto mb-1.5" />
              <div className="text-xs font-semibold text-gray-800">{label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
            </div>
          ))}
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Get started</h2>
          <p className="text-sm text-gray-500 mb-6">
            Connect your Gmail account to start managing emails intelligently with AI.
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl px-4 py-3 font-semibold text-gray-700 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? 'Redirecting...' : 'Continue with Google'}
          </button>

          <p className="text-xs text-gray-400 text-center mt-4">
            We only request access to read and send emails on your behalf.
            Your data is never stored or shared.
          </p>
        </div>
      </div>
    </div>
  );
}
