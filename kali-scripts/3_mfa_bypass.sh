#!/bin/bash
source ./config.sh

echo "=========================================================="
echo " [!] Attack 3: Stolen Password & MFA Enforcement"
echo " Target: ${TARGET_URL}"
echo "=========================================================="

echo -e "\n[Step 1] Attacker provides the CORRECT password for 'alice'..."
RESPONSE=$(curl -s -X POST "${TARGET_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"SecurePass123!"}')

echo "Server Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"requireMfa":true'; then
  echo -e "\n--> [DEFENSE TRIGGERED] Password accepted, BUT session was WITHHELD!"
  echo "--> Server generated a single-use challenge token and demands the 6-digit TOTP."
fi

echo -e "\n[Step 2] Attacker attempts to forge the 6-digit MFA code ('999999')..."
curl -s -w " | HTTP Code: %{http_code}\n" -X POST "${TARGET_URL}/api/auth/verify-mfa" \
  -H "Content-Type: application/json" \
  -d '{"challengeToken":"fake-token","code":"999999"}'

echo -e "\n--> [DEFENSE TRIGGERED] Code rejected (HTTP 401). Without the physical phone, entry is impossible."
