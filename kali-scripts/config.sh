#!/bin/bash
# =================================================================
# AUTOMATIC ZERO-CONFIG IP DISCOVERY (Works on ANY Wi-Fi or Offline)
# =================================================================
GATEWAY_SUBNET=$(ip route show default 2>/dev/null | awk '{print $3}' | cut -d'.' -f1-3)
if [ -z "$GATEWAY_SUBNET" ]; then
  TARGET_IP="127.0.0.1"
else
  TARGET_IP="${GATEWAY_SUBNET}.1"
fi
TARGET_URL="http://${TARGET_IP}:3000"
