'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert,
  Lock,
  User,
  KeyRound,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step state: 'CREDENTIALS' | 'MFA_CHALLENGE'
  const [step, setStep] = useState<'CREDENTIALS' | 'MFA_CHALLENGE'>('CREDENTIALS');
  const [challengeToken, setChallengeToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockoutCountdown, setLockoutCountdown] = useState<number | null>(null);

  // Handle Step 1: Submit Credentials
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setRemainingAttempts(null);
    setLockoutCountdown(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed');
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        if (data.remainingSeconds) {
          setLockoutCountdown(data.remainingSeconds);
        }
        return;
      }

      if (data.requireMfa) {
        setChallengeToken(data.challengeToken);
        setStep('MFA_CHALLENGE');
        setSuccessMsg('Step 1 Passed: Password verified. Please enter your 6-digit MFA code.');
      } else {
        setSuccessMsg('Authentication successful! Redirecting to secure dashboard...');
        setTimeout(() => router.push('/dashboard'), 1000);
      }
    } catch {
      setErrorMsg('Failed to connect to authentication server');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Submit MFA Code
  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken, code: totpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'MFA verification failed');
        return;
      }

      setSuccessMsg('MFA Verified! Creating secure session and redirecting...');
      setTimeout(() => router.push('/dashboard'), 1000);
    } catch {
      setErrorMsg('Network error verifying MFA token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Security Header Card */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/5">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Secure Authentication
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Protected with Argon2id, RFC 6238 MFA, Rate Limiting & Audit Defense
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800 text-xs font-mono">
            <div
              className={`flex items-center space-x-2 ${
                step === 'CREDENTIALS' ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-800 border border-current">
                1
              </span>
              <span>Argon2id Auth</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-800" />
            <div
              className={`flex items-center space-x-2 ${
                step === 'MFA_CHALLENGE' ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-800 border border-current">
                2
              </span>
              <span>TOTP MFA</span>
            </div>
          </div>

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-sm flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{errorMsg}</p>
                {remainingAttempts !== null && remainingAttempts > 0 && (
                  <p className="text-xs text-red-300 mt-1">
                    Warning: Account will lock after {remainingAttempts} more failed attempt(s).
                  </p>
                )}
                {lockoutCountdown !== null && (
                  <p className="text-xs text-amber-300 mt-1 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    Account unlock timer: approx {Math.ceil(lockoutCountdown / 60)} minutes
                  </p>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="font-medium">{successMsg}</p>
            </div>
          )}

          {step === 'CREDENTIALS' ? (
            /* STEP 1: Username & Password */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. alice"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify Credentials</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: Multi-Factor Authentication */
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100">Two-Factor Authentication</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Open Google Authenticator or Authy and enter the 6-digit code for{' '}
                  <span className="text-emerald-400 font-mono">{username}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 text-center">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full tracking-widest text-center py-3 bg-slate-950 border border-slate-700 rounded-lg text-emerald-400 placeholder-slate-600 text-2xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Verify Code & Login</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('CREDENTIALS');
                  setErrorMsg(null);
                }}
                className="w-full text-xs text-slate-400 hover:text-slate-200 text-center py-1.5"
              >
                Cancel and return to credentials
              </button>
            </form>
          )}

          {/* Registration Link */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
            Don&apos;t have an account yet?{' '}
            <Link href="/register" className="text-emerald-400 hover:underline font-medium">
              Create an account with MFA
            </Link>
          </div>
        </div>

        {/* Security Architecture Footnote */}
        <div className="mt-6 grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-mono">
          <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80 flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>Rate Limit: 5 req/min</span>
          </div>
          <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80 flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>Lockout: 5 failed / 15m</span>
          </div>
        </div>
      </div>
    </div>
  );
}
