'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  UserPlus,
  ShieldCheck,
  KeyRound,
  User,
  AlertTriangle,
  CheckCircle2,
  Copy,
  QrCode,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // MFA Setup State after successful registration
  const [mfaData, setMfaData] = useState<{
    secret: string;
    uri: string;
    qrCodeDataUrl: string;
  } | null>(null);
  const [totpVerificationCode, setTotpVerificationCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Real-time password criteria
  const passwordCriteria = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'Number (0-9)', met: /[0-9]/.test(password) },
    { label: 'Special character (!@#$%^&*)', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];
  const allCriteriaMet = passwordCriteria.every((c) => c.met);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    if (!allCriteriaMet) {
      setErrorMsg('Please satisfy all password complexity requirements');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Registration failed');
        return;
      }

      setMfaData(data.mfa);
      setSuccessMsg('Account created with Argon2id! Scan the QR code below to bind Google Authenticator.');
    } catch {
      setErrorMsg('Failed to reach registration server');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/enable-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, token: totpVerificationCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to activate MFA');
        return;
      }

      setSuccessMsg('MFA Successfully activated! Redirecting to login...');
      setTimeout(() => router.push('/'), 1500);
    } catch {
      setErrorMsg('Error confirming MFA token');
    } finally {
      setLoading(false);
    }
  };

  const copySecretToClipboard = () => {
    if (mfaData?.secret) {
      navigator.clipboard.writeText(mfaData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/5">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Create Protected Account
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            NIST-compliant password hashing (Argon2id) & RFC 6238 TOTP Multi-Factor Enrollment
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {/* Feedback */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-sm flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="font-medium">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="font-medium">{successMsg}</p>
            </div>
          )}

          {!mfaData ? (
            /* STEP 1: Registration Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
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
                    placeholder="Choose a username"
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
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create strong password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                  />
                </div>
              </div>

              {/* Real-time Password Strength Check */}
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Password Strength Requirements:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                  {passwordCriteria.map((c, i) => (
                    <div
                      key={i}
                      className={`flex items-center space-x-1.5 ${
                        c.met ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {c.met ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !allCriteriaMet}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/50 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Account & Setup MFA</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: MFA QR Code Enrollment */
            <div className="space-y-5">
              <div className="text-center">
                <div className="inline-flex p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Enroll Multi-Factor Authentication</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Scan this QR code with <span className="text-emerald-400">Google Authenticator</span> or{' '}
                  <span className="text-emerald-400">Authy</span> on your phone:
                </p>
              </div>

              {/* QR Code Card */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-inner max-w-[220px] mx-auto">
                <Image
                  src={mfaData.qrCodeDataUrl}
                  alt="MFA QR Code"
                  width={192}
                  height={192}
                  className="w-48 h-48 rounded"
                  unoptimized
                />
              </div>

              {/* Manual Secret Key */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <p className="text-[11px] text-slate-400 mb-1">Manual entry key (if camera is unavailable):</p>
                <div className="flex items-center justify-between">
                  <code className="text-xs font-mono text-emerald-400 tracking-wider">
                    {mfaData.secret}
                  </code>
                  <button
                    type="button"
                    onClick={copySecretToClipboard}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedSecret ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Test code input to finalize enrollment */}
              <form onSubmit={handleMfaActivation} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 text-center">
                    Enter the 6-Digit Code from Authenticator to Confirm
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={totpVerificationCode}
                    onChange={(e) => setTotpVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full tracking-widest text-center py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-emerald-400 text-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || totpVerificationCode.length !== 6}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Activate MFA & Complete Setup</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Login Link */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/" className="text-emerald-400 hover:underline font-medium">
              Log in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
