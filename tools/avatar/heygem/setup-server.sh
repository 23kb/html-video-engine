#!/usr/bin/env bash
# One-shot Heygem server setup for a fresh Ubuntu 22.04 GPU VM (root).
# Idempotent — safe to re-run. See tools/avatar/heygem/README.md for the
# provider checklist, security notes, and the client-side flow.
set -euo pipefail

echo "== [1/4] Docker + NVIDIA container toolkit =="
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
if ! dpkg -s nvidia-container-toolkit >/dev/null 2>&1; then
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
  curl -fsSL https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
    > /etc/apt/sources.list.d/nvidia-container-toolkit.list
  apt-get update && apt-get install -y nvidia-container-toolkit
  nvidia-ctk runtime configure --runtime=docker
  systemctl restart docker
fi
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi >/dev/null \
  && echo "GPU passthrough OK" || { echo "GPU passthrough FAILED"; exit 1; }

echo "== [2/4] Clone Heygem (MIT, duixcom/Duix.Heygem) =="
if [ ! -d /opt/heygem ]; then
  git clone --depth 1 https://github.com/duixcom/Duix.Heygem /opt/heygem
fi

echo "== [3/4] Launch services (~70GB image pull on first run, ~30 min) =="
cd /opt/heygem/deploy
docker compose up -d

echo "== [4/4] Wait for service ports =="
for i in $(seq 1 60); do
  ok=1
  for p in 18180 8383; do
    curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$p" || ok=0
  done
  [ "$ok" = "1" ] && break
  sleep 10
done
docker compose ps

echo ""
echo "DONE. Services (bound locally — reach them via SSH tunnel, do NOT open"
echo "these ports to the internet; the API has no authentication):"
echo "  :18180  audio preprocess / voice  (POST /v1/preprocess_and_tran)"
echo "  :8383   video synthesis          (POST /easy/submit, GET /easy/query)"
echo ""
echo "From the Windows workstation, tunnel with:"
echo "  ssh -N -L 18180:127.0.0.1:18180 -L 8383:127.0.0.1:8383 root@<VM_IP>"
