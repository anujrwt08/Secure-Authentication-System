'use client';

import { useState } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Flame,
  Radio,
} from 'lucide-react';

export default function DemoGuidePage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const attacks = [
    {
      id: 1,
      title: 'Attack 1: High-Speed IP Brute-Force (Rate Limiter Defense)',
      category: 'Denial of Service / Automated Bot',
      description:
        'Run this rapid loop from your Kali Linux terminal to simulate a bot hammering the login endpoint with requests.',
      command: `for i in {1..8}; do
  echo "--- Request #$i ---"
  curl -s -X POST http://<WINDOWS_IP>:3000/api/auth/login \\
    -H "Content-Type: application/json" \\
    -d '{"username":"alice","password":"wrongpassword"}'
  echo ""
  sleep 0.2
done`,
      expectedResult:
        'Requests 1-5 will return 401 with remaining attempts. Starting on Request 6, the server immediately triggers HTTP 429 Too Many Requests, blocking the IP.',
      defenseProof:
        'Open the SOC Audit Logs page on Windows to see the orange "RATE_LIMITED" security events flagging your Kali VM\'s IP address.',
    },
    {
      id: 2,
      title: 'Attack 2: Targeted Password Guessing (Account Lockout Defense)',
      category: 'Credential Cracking / Dictionary Attack',
      description:
        'Simulates an attacker trying common dictionary passwords against a known user (e.g., alice).',
      command: `passwords=("123456" "password" "qwerty" "admin123" "letmein" "spring2026")

for pwd in "\${passwords[@]}"; do
  echo "[Kali Attacker] Trying password: $pwd"
  curl -s -X POST http://<WINDOWS_IP>:3000/api/auth/login \\
    -H "Content-Type: application/json" \\
    -d "{\\"username\\":\\"alice\\",\\"password\\":\\"$pwd\\"}"
  echo ""
  sleep 1
done`,
      expectedResult:
        'After 5 consecutive failures, the server returns HTTP 423 Locked ("Account locked due to 5 consecutive failed login attempts"). Any subsequent login attempt is instantly rejected.',
      defenseProof:
        'The SOC Audit Log on Windows will show a red "ACCOUNT_LOCKED" alert, and Alice\'s account will appear in the "Currently Locked Accounts" list.',
    },
    {
      id: 3,
      title: 'Attack 3: Correct Password with Missing / Spoofed MFA Code',
      category: 'MFA Bypass Attempt',
      description:
        'Simulates an attacker who managed to compromise the user password, but attempts to bypass or brute-force the second factor.',
      command: `# Step A: Attacker submits correct password (returns requireMfa: true + challengeToken)
CHALLENGE_RESP=$(curl -s -X POST http://<WINDOWS_IP>:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"alice","password":"ValidPassword123!"}')

echo "Server response: $CHALLENGE_RESP"

# Step B: Attacker attempts to forge or guess the 6-digit TOTP code
curl -s -X POST http://<WINDOWS_IP>:3000/api/auth/verify-mfa \\
  -H "Content-Type: application/json" \\
  -d '{"challengeToken":"dummy-token-or-extracted-token","code":"123456"}'`,
      expectedResult:
        'The server rejects the spoofed code with HTTP 401 ("Invalid 6-digit authenticator code") and logs an MFA_FAILED security incident.',
      defenseProof:
        'Without the physical device generating dynamic HMAC-SHA1 tokens every 30 seconds, the account cannot be breached even if the password is known.',
    },
    {
      id: 4,
      title: 'Attack 4: Client-Side Session Stealing (XSS / Cookie Theft)',
      category: 'Session Hijacking',
      description:
        'Simulates an attacker attempting to steal the session token through malicious JavaScript injection.',
      command: `// Open Browser DevTools Console on the logged-in Dashboard:
console.log("Cookies visible to JS:", document.cookie);`,
      expectedResult:
        'document.cookie will NOT return the secure_session_token. The token is completely hidden from JavaScript due to the HttpOnly flag.',
      defenseProof:
        'The token is transmitted only in HTTP headers directly to the backend, rendering stored and reflected XSS token theft impossible.',
    },
  ];

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="pb-6 mb-8 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Kali Linux Attack Simulation Lab
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Live attack scenarios to execute from your Kali VM to test and prove your authentication defenses
            </p>
          </div>
        </div>
      </div>

      {/* Preparation Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 mb-8 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center space-x-2 mb-3">
          <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
          <span>Step 0: Connect Kali Linux VM to Windows Host</span>
        </h2>
        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="font-bold text-white">1. Find your Windows Host IP:</span>
            <p className="text-slate-400 mt-1">
              Open PowerShell on Windows and run <code className="text-emerald-400 font-mono">ipconfig</code>. Look for the IPv4 Address of your VMnet adapter or Local Wi-Fi (e.g.{' '}
              <span className="text-emerald-400 font-mono">192.168.1.15</span> or{' '}
              <span className="text-emerald-400 font-mono">192.168.120.1</span>).
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="font-bold text-white">2. Start the Server Accessible to Kali:</span>
            <p className="text-slate-400 mt-1">
              In your Windows terminal, run Next.js bound to all interfaces:
            </p>
            <div className="mt-2 p-2 bg-slate-900 rounded font-mono text-emerald-400 text-xs">
              npm run dev -- -H 0.0.0.0
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="font-bold text-white">3. Test Connection from Kali Linux:</span>
            <p className="text-slate-400 mt-1">
              Open the terminal in Kali Linux and verify reachability:
            </p>
            <div className="mt-2 p-2 bg-slate-900 rounded font-mono text-emerald-400 text-xs">
              curl -I http://&lt;WINDOWS_IP&gt;:3000
            </div>
          </div>
        </div>
      </div>

      {/* Attack Scenarios */}
      <div className="space-y-6">
        {attacks.map((attack, index) => (
          <div
            key={attack.id}
            className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 uppercase font-semibold">
                  {attack.category}
                </span>
                <h3 className="text-base font-bold text-white mt-1.5">{attack.title}</h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">Scenario #{attack.id}</span>
            </div>

            <p className="text-xs text-slate-300">{attack.description}</p>

            {/* Code Block */}
            <div className="relative">
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 border-t border-x border-slate-800 rounded-t-lg text-[11px] font-mono text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-red-400" />
                  <span>Kali Terminal Command</span>
                </span>
                <button
                  onClick={() => copyCode(attack.command, index)}
                  className="hover:text-white flex items-center space-x-1 transition-colors"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-b-lg font-mono text-xs text-slate-200 overflow-x-auto">
                {attack.command}
              </pre>
            </div>

            {/* Expected Result & Defense Proof */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="font-semibold text-amber-400 block mb-1">Expected Server Response:</span>
                <p className="text-slate-400">{attack.expectedResult}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/50">
                <span className="font-semibold text-emerald-400 block mb-1">Live Defense Proof:</span>
                <p className="text-slate-300">{attack.defenseProof}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
