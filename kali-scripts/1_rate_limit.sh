#!/bin/bash
source ./config.sh

echo "=========================================================="
echo " [!] Attack 1: High-Speed IP Rate Limiting Test"
echo " Target: ${TARGET_URL}/api/auth/login"
echo " Sending 8 rapid requests (Limit: 5 req/min)..."
echo "=========================================================="

for i in {1..8}; do
  echo -n "[Request #$i] "
  curl -s -w " | HTTP Code: %{http_code}\n" -X POST "${TARGET_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"bot_attacker","password":"password123"}'
  sleep 0.15
done

echo -e "\n[✓] Finished! Requests 6-8 return HTTP 429 (Too Many Requests)."
echo "[✓] Check your Windows SOC Dashboard for orange 'RATE_LIMITED' alerts."
