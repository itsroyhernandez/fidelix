#!/usr/bin/env bash
# Sube Fidelix a un repo de GitHub. Uso:
#   bash scripts/push-github.sh https://github.com/TU-USUARIO/fidelix.git
# Requisito: el repo ya creado (vacío) en github.com, y estar logueado
# (Git Credential Manager abre el navegador la primera vez que hagas push).
set -e
URL="$1"
if [ -z "$URL" ]; then
  echo "Falta la URL del repo. Ej: bash scripts/push-github.sh https://github.com/royner/fidelix.git"
  exit 1
fi
cd "$(dirname "$0")/.."
if git remote | grep -q '^origin$'; then
  git remote set-url origin "$URL"
else
  git remote add origin "$URL"
fi
git branch -M main
git push -u origin main
echo "Listo. Repo en: $URL"
