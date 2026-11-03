#!/usr/bin/env bash
# Roda localmente o mesmo que o CI (.github/workflows/ci.yml).
# A lista de comandos tem de ficar igual à dos jobs do ci.yml (e vice-versa).
# CI_INSTALL=1 também roda npm ci em cada pasta (apaga e reinstala o node_modules).
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
step() { printf '\n==> %s\n' "$*"; }

cd "$root"
step "Pacote uaiui-ds (raiz)"
[ "${CI_INSTALL:-}" = 1 ] && { step "npm ci"; npm ci; }
step "npm run check"; npm run check
step "npm pack --dry-run"; npm pack --dry-run

cd "$root/figma-plugin"
step "Plugin do Figma (figma-plugin/)"
[ "${CI_INSTALL:-}" = 1 ] && { step "npm ci"; npm ci; }
step "npm test"; npm test
step "npx tsc -p ."; npx tsc -p .
step "npm run build"; npm run build

printf '\nCI local: tudo passou.\n'
