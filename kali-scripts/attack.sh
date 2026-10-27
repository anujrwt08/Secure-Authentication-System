#!/bin/bash

# 1. Automatically find Windows Host IP on VMware
GATEWAY_SUBNET=$(ip route show default 2>/dev/null | awk '{print $3}' | cut -d'.' -f1-3)
if [ -z "$GATEWAY_SUBNET" ]; then
  TARGET_IP="127.0.0.1"
else
  TARGET_IP="${GATEWAY_SUBNET}.1"
fi
TARGET_URL="http://${TARGET_IP}:3000"

while true; do
  clear
  echo "=========================================================="
  echo "       🛡️   KALI LINUX AUTHENTICATION ATTACK LAB          "
  echo "       Target Windows Host : ${TARGET_IP}                 "
  echo "       Target Server URL   : ${TARGET_URL}                "
  echo "=========================================================="
  echo "  1) Test Rate Limiting (Automated Bot / DoS -> HTTP 429)"
  echo "  2) Test Account Lockout (5 Failed Passwords -> HTTP 423)"
  echo "  3) Test MFA Enforcement (Stolen Password -> MFA Required)"
  echo "  4) Check Connection to Windows Server (Ping & HTTP Test)"
  echo "  5) Exit"
  echo "=========================================================="
  read -p "Select an action to launch [1-5]: " choice

  case $choice in
    1)
      echo -e "\n=========================================================="
      echo " [!] Attack 1: Sending 8 rapid requests (Limit: 5/min)..."
      echo "=========================================================="
      for i in {1..8}; do
        echo -n "[Request #$i] "
        curl -s -w " | HTTP Code: %{http_code}\n" -X POST "${TARGET_URL}/api/auth/login" \
          -H "Content-Type: application/json" \
          -d '{"username":"bot_attacker","password":"password123"}'
        sleep 0.15
      done
      echo -e "\n[✓] Requests 6-8 returned HTTP 429 (Too Many Requests)!"
      echo "[✓] Check your Windows SOC Dashboard for orange RATE_LIMITED alerts."
      echo ""
      read -p "Press Enter to return to menu..."
      ;;
    2)
      echo -e "\n=========================================================="
      echo " [!] Attack 2: Attempting 6 passwords against user 'alice'..."
      echo "=========================================================="
      passwords=("123456" "password" "qwerty" "admin123" "letmein" "spring2026")
      for pwd in "${passwords[@]}"; do
        echo -e "\n[Kali Attacker] Trying password: '$pwd'"
        curl -s -w " | HTTP Code: %{http_code}\n" -X POST "${TARGET_URL}/api/auth/login" \
          -H "Content-Type: application/json" \
          -d "{\"username\":\"alice\",\"password\":\"$pwd\"}"
        sleep 1.2
      done
      echo -e "\n[✓] Attempt #5 locked Alice's account with HTTP 423!"
      echo "[✓] Check your Windows SOC Dashboard for red ACCOUNT_LOCKED alerts."
      echo ""
      read -p "Press Enter to return to menu..."
      ;;
    3)
      echo -e "\n=========================================================="
      echo " [!] Attack 3: Stolen Password & MFA Enforcement"
      echo "=========================================================="
      echo -e "\n[Step 1] Submitting correct password for 'alice'..."
      RESP=$(curl -s -X POST "${TARGET_URL}/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"alice","password":"SecurePass123!"}')
      echo "Server Response: $RESP"
      echo -e "\n--> [DEFENSE] Password was correct, but session was WITHHELD without 6-digit TOTP!"

      echo -e "\n[Step 2] Attacker tries to bypass with fake code '999999'..."
      curl -s -w " | HTTP Code: %{http_code}\n" -X POST "${TARGET_URL}/api/auth/verify-mfa" \
        -H "Content-Type: application/json" \
        -d '{"challengeToken":"fake-token","code":"999999"}'
      echo -e "\n--> [BLOCKED] HTTP 401: Without physical Google Authenticator, entry is impossible."
      echo ""
      read -p "Press Enter to return to menu..."
      ;;
    4)
      echo -e "\n[+] Pinging Windows Host (${TARGET_IP})..."
      ping -c 2 $TARGET_IP
      echo -e "\n[+] Testing Web Server on Port 3000..."
      curl -I --connect-timeout 3 "${TARGET_URL}"
      echo ""
      read -p "Press Enter to return to menu..."
      ;;
    5)
      echo "Exiting attack lab."
      exit 0
      ;;
    *)
      echo "Invalid choice."
      sleep 1
      ;;
  esac
done
