import React, { useState } from 'react';
import { Rocket, User, Lock, ArrowRight, Loader2 } from 'lucide-react';

interface AuthProps {
  onLogin: (token: string, username: string) => void;
}

const API_BASE_URL = 'http://localhost:3001';

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      onLogin(data.token, data.username);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0b1020] text-[#e8ecff] relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-600/20 shadow-[0_0_30px_rgba(37,99,235,0.4)] rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30">
            <Rocket className="text-blue-400 w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Asteria Station
          </h1>
          <p className="text-blue-200/70">Management Protocol Terminal</p>
        </div>

        <div className="bg-[#121a30]/80 backdrop-blur-xl border border-blue-900/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            {isLogin ? 'Establish Connection' : 'Initialize Personnel'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-200/70 mb-1">Commander ID</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/50" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0b1020]/50 border border-blue-900/50 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="Enter your identifier"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200/70 mb-1">Passcode</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/50" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0b1020]/50 border border-blue-900/50 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl py-3 transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="flex items-center justify-center gap-2 relative z-10">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Authenticate' : 'Register'}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
            >
              {isLogin ? 'Need an access code? Register here.' : 'Already have clearance? Authenticate.'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
