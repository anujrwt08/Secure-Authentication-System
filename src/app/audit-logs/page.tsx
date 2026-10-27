'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ShieldAlert,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Radio,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: string;
  username: string | null;
  userId: string | null;
  ipAddress: string;
  userAgent: string | null;
  details: string | null;
}

interface LockedUser {
  username: string;
  failedAttempts: number;
  lockedUntil: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState({
    totalLogs: 0,
    successfulLogins: 0,
    failedLogins: 0,
    accountLockouts: 0,
    rateLimitedEvents: 0,
    lockedAccountsCount: 0,
  });
  const [lockedUsers, setLockedUsers] = useState<LockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (data.stats) setStats(data.stats);
        if (data.lockedUsers) setLockedUsers(data.lockedUsers);
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 3000); // 3-second live refresh
    return () => clearInterval(interval);
  }, [fetchLogs, autoRefresh]);

  const handleUnlock = async (username: string) => {
    try {
      const res = await fetch('/api/admin/unlock-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        setUnlockMessage(`Account "${username}" was manually unlocked!`);
        setTimeout(() => setUnlockMessage(null), 3000);
        fetchLogs();
      }
    } catch {
      setUnlockMessage('Failed to unlock account');
    }
  };

  const handleResetRateLimit = async () => {
    try {
      const res = await fetch('/api/admin/unlock-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetAllRateLimits: true }),
      });
      if (res.ok) {
        setUnlockMessage('All IP rate limits have been cleared successfully!');
        setTimeout(() => setUnlockMessage(null), 3000);
        fetchLogs();
      }
    } catch {
      setUnlockMessage('Failed to reset rate limits');
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const timeStr = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const dateStr = date.toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      return { timeStr, dateStr };
    } catch {
      return { timeStr: isoString, dateStr: '' };
    }
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesFilter =
      filterType === 'ALL' ||
      (filterType === 'FAILED' && log.eventType.includes('FAILED')) ||
      (filterType === 'LOCKED' && log.eventType === 'ACCOUNT_LOCKED') ||
      (filterType === 'LIMITED' && log.eventType === 'RATE_LIMITED') ||
      (filterType === 'SUCCESS' && log.eventType.includes('SUCCESS'));

    const matchesSearch =
      searchQuery === '' ||
      (log.username && log.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.ipAddress.includes(searchQuery) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const getEventBadge = (eventType: string) => {
    if (eventType.includes('SUCCESS') || eventType.includes('ENABLED')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
          <CheckCircle className="w-3 h-3" />
          <span>{eventType}</span>
        </span>
      );
    }
    if (eventType.includes('FAILED') || eventType === 'ACCOUNT_LOCKED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950 text-red-400 border border-red-800">
          <XCircle className="w-3 h-3" />
          <span>{eventType}</span>
        </span>
      );
    }
    if (eventType === 'RATE_LIMITED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-950 text-orange-400 border border-orange-800 animate-pulse">
          <ShieldAlert className="w-3 h-3" />
          <span>RATE_LIMITED</span>
        </span>
      );
    }
    if (eventType === 'MFA_CHALLENGE') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800">
          <Clock className="w-3 h-3" />
          <span>{eventType}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
        <span>{eventType}</span>
      </span>
    );
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              SOC Security Audit Feed
            </h1>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>LIVE TELEMETRY</span>
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time monitoring of authentication events, failed credential attempts, and rate limiting blocks
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              autoRefresh
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>Auto-Refresh: {autoRefresh ? '3s' : 'Paused'}</span>
          </button>

          <button
            onClick={handleResetRateLimit}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
          >
            Reset Rate Limiter
          </button>
        </div>
      </div>

      {unlockMessage && (
        <div className="mb-6 p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between">
          <span>{unlockMessage}</span>
          <button onClick={() => setUnlockMessage(null)} className="text-xs text-emerald-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Telemetry Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs font-medium text-slate-400">Total Audit Logs</div>
          <div className="mt-2 text-2xl font-extrabold text-white font-mono">{stats.totalLogs}</div>
          <div className="text-[11px] text-slate-500 mt-1">Recorded in SQLite</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs font-medium text-emerald-400">Successful Logins</div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-400 font-mono">
            {stats.successfulLogins}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">MFA & Sessions Granted</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs font-medium text-red-400">Failed Attempts</div>
          <div className="mt-2 text-2xl font-extrabold text-red-400 font-mono">
            {stats.failedLogins}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Bad passwords / tokens</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="text-xs font-medium text-orange-400">Account Lockouts</div>
          <div className="mt-2 text-2xl font-extrabold text-orange-400 font-mono">
            {stats.accountLockouts}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">5-attempt threshold reached</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg col-span-2 sm:col-span-1">
          <div className="text-xs font-medium text-yellow-400">Rate Limit Blocks</div>
          <div className="mt-2 text-2xl font-extrabold text-yellow-400 font-mono">
            {stats.rateLimitedEvents}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">IP brute-force mitigation</div>
        </div>
      </div>

      {/* Currently Locked Accounts Notice */}
      {lockedUsers.length > 0 && (
        <div className="mb-8 p-4 rounded-xl bg-red-950/40 border border-red-500/40">
          <div className="flex items-center space-x-2 text-red-400 font-bold text-sm mb-3">
            <Lock className="w-4 h-4" />
            <span>Currently Locked Accounts ({lockedUsers.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {lockedUsers.map((u) => (
              <div
                key={u.username}
                className="p-3 rounded-lg bg-slate-950/80 border border-red-900/50 flex items-center justify-between"
              >
                <div>
                  <p className="font-mono font-bold text-slate-200 text-sm">{u.username}</p>
                  <p className="text-[11px] text-red-400">
                    Failed: {u.failedAttempts} times • Cooldown until{' '}
                    {formatTimestamp(u.lockedUntil).timeStr}
                  </p>
                </div>
                <button
                  onClick={() => handleUnlock(u.username)}
                  className="px-2.5 py-1 rounded bg-red-900/50 hover:bg-red-800/60 border border-red-700/60 text-xs text-red-200 flex items-center space-x-1"
                >
                  <Unlock className="w-3 h-3" />
                  <span>Unlock</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-1 overflow-x-auto pb-2 sm:pb-0">
          {['ALL', 'SUCCESS', 'FAILED', 'LOCKED', 'LIMITED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterType === f
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search IP, username, details..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800 text-[11px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">User Target</th>
                <th className="px-4 py-3">Source IP</th>
                <th className="px-4 py-3">Security Telemetry Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Loading telemetry feed...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No security events match the current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      <span className="font-semibold text-slate-200">
                        {formatTimestamp(log.timestamp).timeStr}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        {formatTimestamp(log.timestamp).dateStr}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{getEventBadge(log.eventType)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.username ? (
                        <span className="text-slate-200 font-bold">{log.username}</span>
                      ) : (
                        <span className="text-slate-600 italic">anonymous</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                        {log.ipAddress}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <span>{log.details || '—'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
