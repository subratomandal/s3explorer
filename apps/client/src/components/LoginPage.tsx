import { useState } from 'react';
import { Eye, EyeOff, AlertCircle, ArrowRight, Check } from 'lucide-react';
import * as api from '../api';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.login(password, rememberMe);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center mx-auto mb-4 sm:mb-5">
            <img
              src="/logo.svg"
              alt="S3 Explorer"
              className="w-14 h-14 sm:w-16 sm:h-16 invert"
            />
          </div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Welcome back</h1>
          <p className="text-sm text-foreground-muted mt-1.5 sm:mt-2">Enter your password to continue</p>
        </div>

        {/* Card */}
        <div className="bg-background-secondary border border-border rounded-xl p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm text-foreground-secondary">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-12 font-mono h-11 sm:h-10 text-base sm:text-sm"
                  placeholder="Enter password"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-foreground-muted hover:text-foreground transition-colors w-11"
                >
                  {showPassword ? <EyeOff className="h-5 w-5 sm:h-4 sm:w-4" /> : <Eye className="h-5 w-5 sm:h-4 sm:w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group py-1">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                rememberMe
                  ? 'bg-accent-purple border-accent-purple'
                  : 'border-border bg-transparent group-hover:border-border-hover'
              }`}>
                {rememberMe && <Check className="w-3 h-3 text-white" />}
              </div>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="hidden"
              />
              <span className="text-sm text-foreground-secondary group-hover:text-foreground transition-colors">Remember me</span>
            </label>

            {error && (
              <div className="p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 px-4 rounded-lg bg-accent-purple text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
