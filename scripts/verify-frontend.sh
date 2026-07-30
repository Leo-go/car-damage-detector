#!/usr/bin/env bash
set -euo pipefail
source ~/.nvm/nvm.sh
cd "$(dirname "$0")/frontend"
npm install
npm run build
echo "BUILD_OK"
