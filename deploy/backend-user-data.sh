#!/usr/bin/env bash
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y git python3 python3-venv python3-pip

APP_DIR=/opt/campus-flow
BACKEND_DIR="$APP_DIR/backend"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone https://github.com/sandipan-kundu1/Campus-flow.git "$APP_DIR"
else
  git -C "$APP_DIR" pull --ff-only
fi

cd "$BACKEND_DIR"
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip wheel setuptools
pip install -r requirements.txt

cat >/etc/systemd/system/campus-flow-backend.service <<'SERVICE'
[Unit]
Description=Campus Flow FastAPI backend
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/campus-flow/backend
Environment=PYTHONUNBUFFERED=1
ExecStart=/opt/campus-flow/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

chown -R ubuntu:ubuntu "$APP_DIR"
systemctl daemon-reload
systemctl enable campus-flow-backend
systemctl start campus-flow-backend
