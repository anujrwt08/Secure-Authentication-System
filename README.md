# 🛡️ Secure Authentication & SOC Audit Defense System

A production-grade, NIST & OWASP aligned cybersecurity authentication platform built with **Next.js 14**, **SQLite**, **Argon2id**, **RFC 6238 TOTP (Google Authenticator)**, **In-Memory Rate Limiting**, **Account Lockout Protections**, and a **Real-Time SOC Audit Logging Dashboard**.

Designed for live cyber-defense demonstrations, portfolio presentations, and red-team vs. blue-team attack simulations (e.g., using **Kali Linux**).

---

## 🚀 Key Security Implementations

| Security Feature | Implementation Details | Defense Against |
| :--- | :--- | :--- |
| **Password Hashing** | **Argon2id** (`m=19MB`, `t=2 iterations`, `p=1 thread`) with per-user unique cryptographic salt. | GPU password cracking clusters, ASIC miners, and side-channel timing attacks. |
| **Multi-Factor Auth (MFA)** | **TOTP RFC 6238** with interactive QR Code generation (Google Authenticator / Authy compatible). Includes `±30s` window tolerance. | Credential stuffing, stolen passwords, phishing, clock drift. |
| **Rate Limiting** | Sliding window rate limiter tracking client IP addresses (max 5 requests/min on login). Returns HTTP `429 Too Many Requests`. | Automated brute-force bots, rapid credential spraying, Denial of Service. |
| **Account Lockout** | Tracks failed attempts per username. Exceeding **5 failed attempts** triggers an immediate **15-minute lockout** (HTTP `423 Locked`). | Targeted brute-force attacks across distributed/rotating IP addresses. |
| **Secure Sessions** | Cryptographically random 256-bit opaque tokens stored in server-side SQLite database and served via `HttpOnly; SameSite=Lax; Path=/` cookies. | XSS-based cookie theft (`document.cookie`), session tampering, CSRF. |
| **SOC Audit Logging** | Real-time structured telemetry capturing timestamps, source IPs, event types (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `MFA_FAILED`, `ACCOUNT_LOCKED`, `RATE_LIMITED`), and details. | Insider threats, lack of forensic trails, compliance audits. |

---

## 📁 Project Architecture

```
secure-auth-system/
├── kali-scripts/                   # Kali Linux attack simulation toolkit (saved on Windows)
│   ├── attack.sh                   # Master interactive terminal attack menu
│   ├── config.sh                   # Auto-discovery script for Windows Host IP
│   ├── 1_rate_limit.sh             # Bot attack script (triggers HTTP 429)
│   ├── 2_lockout.sh                # Dictionary password attack (triggers HTTP 423)
│   └── 3_mfa_bypass.sh             # 2FA bypass attempt script (triggers HTTP 401)
├── prisma/
│   ├── dev.db                      # Zero-configuration SQLite database
│   └── schema.prisma               # User, Session, and AuditLog schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── register/       # Argon2id hashing & MFA QR generation
│   │   │   │   ├── enable-mfa/     # Initial TOTP code confirmation
│   │   │   │   ├── login/          # Rate limiting, Lockout & Credential checks
│   │   │   │   ├── verify-mfa/     # TOTP challenge verification & Session creation
│   │   │   │   ├── logout/         # Session invalidation & Cookie destruction
│   │   │   │   └── me/             # Session inspection endpoint
│   │   │   ├── audit-logs/         # SOC telemetry & statistics API
│   │   │   └── admin/unlock-account/ # Single-click reset for lockouts & rate limits
│   │   ├── audit-logs/page.tsx     # Real-time Security Operations Center dashboard
│   │   ├── dashboard/page.tsx      # User inspection dashboard (Argon2 details & Cookie flags)
│   │   ├── register/page.tsx       # Registration & MFA QR Code enrollment
│   │   ├── page.tsx                # Two-step login interface (Credentials -> TOTP)
│   │   └── layout.tsx              # Cybersecurity theme & navigation
│   └── lib/
│       ├── auth.ts                 # Argon2id & TOTP cryptography helpers
│       ├── security.ts             # Rate limiter, Account lockout & Audit logger
│       └── prisma.ts               # Database client singleton
```

---

## ⚡ How to Run the Project on Windows

### 1. Open Terminal in the Project Directory
```powershell
cd "C:\Users\anujr\.gemini\antigravity\scratch\secure-auth-system"
```

### 2. Start the Development Server
Bind to `0.0.0.0` so your **Kali Linux VM** can reach it across VMware:
```powershell
npm run dev -- -H 0.0.0.0
```
Open **[http://localhost:3000](http://localhost:3000)** in your Windows browser.

---

## 🎯 How to Run the Demo (Windows Host + Kali Linux VM)

### Part A: Windows Host (The Defense Walkthrough)
1. Navigate to **[http://localhost:3000/register](http://localhost:3000/register)**:
   * Create user `alice` with password `SecurePass123!`.
   * Scan the displayed QR Code with **Google Authenticator** or **Authy** on your phone (or copy the manual key).
   * Enter the 6-digit code to activate MFA.
2. Go to **Login** (`/`):
   * Enter `alice` and password $\rightarrow$ Prompted for 6-digit code $\rightarrow$ Enter code $\rightarrow$ Redirected to `/dashboard`.
3. Open **User Dashboard** (`/dashboard`):
   * Inspect the stored **Argon2id** hash structure and **HttpOnly** cookie flags.
4. Open **SOC Audit Logs** (`/audit-logs`) in a split window:
   * View the real-time feed with recorded timestamps, IP address, and green `LOGIN_SUCCESS` badges.

---

### Part B: Kali Linux VM (The Attack Simulation)

The attack scripts are saved inside `kali-scripts/` on your Windows host.

In your Kali Linux VM terminal:
```bash
mkdir -p ~/auth-attack-lab && cd ~/auth-attack-lab
nano attack.sh
# (Paste the contents of kali-scripts/attack.sh)
chmod +x attack.sh
./attack.sh
```

#### Menu Options in Kali:
1. **Option 1: Rate Limiter Trigger (DoS / Bot Simulation)**
   * Sends 8 requests in 1.5 seconds.
   * **Result:** After 5 attempts, the server immediately returns **`HTTP 429 Too Many Requests`**.
   * **Proof:** Watch the orange **`RATE_LIMITED`** alerts appear in real-time on your Windows SOC screen capturing Kali's IP.
2. **Option 2: Targeted Password Guessing (Account Lockout)**
   * Tries 6 common passwords against `alice`.
   * **Result:** On attempt 5, the account is locked. Subsequent attempts return **`HTTP 423 Locked`**.
   * **Proof:** Windows `/audit-logs` shows a red **`ACCOUNT_LOCKED`** alert and lists `alice` under *Currently Locked Accounts*.
3. **Option 3: MFA Bypass Attempt (Stolen Password Simulation)**
   * Attacker submits correct password, but attempts to spoof the 6-digit MFA code.
   * **Result:** Server rejects the spoofed code (**`HTTP 401 Unauthorized`**) and withholds the session token.
4. **Option 4: Connectivity Test**
   * Pings Windows host and tests HTTP port 3000.
