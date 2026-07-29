#!/bin/bash
set -Eeuo pipefail

echo '=============================='
echo ' YowThi ERP Deploy Script'
date '+%Y-%m-%d %H:%M:%S'
echo '=============================='

cd /var/www/yowthi-erp

echo ''
echo '>>> [1/7] verify clean tracked worktree + git pull'
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo 'Refusing deployment: tracked Production worktree changes detected.' >&2
  git status --short --untracked-files=no >&2
  exit 1
fi
git pull --ff-only origin master

echo ''
echo '>>> [2/7] backend npm ci + prisma generate'
cd backend
npm ci
npx prisma generate

echo ''
echo '>>> [3/7] verify database migration status'
npx prisma migrate status

echo ''
echo '>>> [4/7] backend build'
npm run build
cd ..

echo ''
echo '>>> [5/7] frontend npm ci + build'
cd frontend
npm ci
npm run build
cd ..

echo '>>> [6/7] pm2 restart'
pm2 restart yowthi-backend

echo ''
echo '>>> [7/7] pm2 logs (last 30 lines)'
sleep 3
pm2 logs yowthi-backend --lines 30 --nostream

echo ''
echo '=============================='
echo ' Deploy finished!'
date '+%Y-%m-%d %H:%M:%S'
echo '=============================='
