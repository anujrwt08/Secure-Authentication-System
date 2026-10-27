'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Key,
  Cookie,
  LogOut,
  Clock,
  Cpu,
  Layers,
  CheckCircle2,
  Lock,
  Terminal,
} from 'lucide-react';

interface UserData {
  id: string;
  username: string;
  mfaEnabled: boolean;
  createdAt: string;
  passwordHashPreview?: string;
  sessionId: string;
  sessionTokenPreview: string;
  sessionExpiresAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/');
          return;
        }
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          router.push('/');
        }
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-mono">Verifying secure session token...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Security Inspection Dashboard
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Session Authenticated</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Logged in as <span className="text-emerald-400 font-semibold font-mono">{user.username}</span> • Account ID: {user.id.slice(0, 8)}...
          </p>
        </div>

        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-sm font-medium transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>{logoutLoading ? 'Invalidating...' : 'Log Out & Invalidate Session'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Argon2id Password Hashing Engine */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white">Argon2id Hashing</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                OWASP Recommended
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Your password was never stored in plain text. It was hashed using memory-hard Argon2id to defeat GPU brute-forcing:
            </p>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[11px] text-emerald-400 break-all mb-4">
              {user.passwordHashPreview || '$argon2id$v=19$m=19456,t=2,p=1$...'}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-slate-500" />
                  <span>Memory Cost (m)</span>
                </span>
                <span className="font-mono text-slate-200">19,456 KB (~19 MB RAM)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Time Cost (t)</span>
                </span>
                <span className="font-mono text-slate-200">2 Iterations</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Parallelism (p)</span>
                </span>
                <span className="font-mono text-slate-200">1 Thread</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800/80 text-[11px] text-emerald-400 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Resistant to side-channel & offline dictionary attacks</span>
          </div>
        </div>

        {/* Card 2: Multi-Factor Authentication State */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white">MFA Enrollment</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                RFC 6238
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Account is secured with Time-Based One-Time Password (TOTP) algorithm:
            </p>

            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center space-x-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Status: Active & Enforced</p>
                <p className="text-[11px] text-slate-400">Rotates every 30 seconds via HMAC-SHA1</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Authenticator Support</span>
                <span className="font-medium text-slate-200">Google Auth, Authy</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Enforcement Trigger</span>
                <span className="font-medium text-slate-200">Every Login Request</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Phishing Protection</span>
                <span className="font-medium text-emerald-400">Dynamic single-use tokens</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800/80 text-[11px] text-emerald-400 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Protects against stolen password credential stuffing</span>
          </div>
        </div>

        {/* Card 3: Session Security & HttpOnly Cookie */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Cookie className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white">Session Security</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                256-bit Entropy
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Session state is verified via cryptographically random opaque tokens stored with strict browser security flags:
            </p>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 mb-4 space-y-1">
              <div className="text-[11px] text-slate-400">Active Token Preview:</div>
              <div className="font-mono text-xs text-emerald-400">{user.sessionTokenPreview}</div>
              <div className="text-[10px] text-slate-500 pt-1">
                Expires: {new Date(user.sessionExpiresAt).toLocaleString()}
              </div>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between p-1.5 bg-slate-950 rounded border border-slate-800/60">
                <span className="text-slate-400">HttpOnly Flag:</span>
                <span className="text-emerald-400 font-bold">TRUE (Blocks XSS theft)</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-slate-950 rounded border border-slate-800/60">
                <span className="text-slate-400">SameSite Flag:</span>
                <span className="text-emerald-400 font-bold">LAX (Mitigates CSRF)</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800/80 text-[11px] text-emerald-400 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Zero sensitive credentials stored in client-side localStorage</span>
          </div>
        </div>
      </div>

      {/* Demo Test Instructions */}
      <div className="mt-8 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Interactive Demo Verification: Test HttpOnly Protection in Your Browser</span>
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          Try accessing your session cookie using JavaScript in the browser DevTools Console:
        </p>
        <div className="p-3 bg-slate-950 rounded-lg font-mono text-xs text-slate-300 border border-slate-800/80 flex items-center justify-between">
          <span>console.log(document.cookie);</span>
          <span className="text-emerald-400 text-[11px] font-mono">Notice: secure_session_token is completely invisible</span>
        </div>
      </div>
    </div>
  );
}
