#!/bin/bash
set -e

echo '=============================='
echo ' YowThi ERP Deploy Script'
date '+%Y-%m-%d %H:%M:%S'
echo '=============================='

cd /var/www/yowthi-erp

echo ''
echo '>>> [1/6] git pull'
git pull origin master

echo ''
echo '>>> [2/6] backend npm install + build'
cd backend
npm install
npm run build
cd ..

echo ''
echo '>>> [3/6] frontend npm install + build'
cd frontend
npm install
npm run build
cd ..

echo ''
echo '>>> [4/6] prisma generate'
cd backend
npx prisma generate
cd ..

echo ''
echo '=========================================='
echo ' NOTICE: If schema.prisma was changed,'
echo ' run manually BEFORE restarting pm2:'
echo '   cd /var/www/yowthi-erp/backend'
echo '   npx prisma db push'
echo ' (or create a migration if needed)'
echo '=========================================='
echo ''

echo '>>> [5/6] pm2 restart'
pm2 restart yowthi-backend

echo ''
echo '>>> [6/6] pm2 logs (last 30 lines)'
sleep 3
pm2 logs yowthi-backend --lines 30 --nostream

echo ''
echo '=============================='
echo ' Deploy finished!'
date '+%Y-%m-%d %H:%M:%S'
echo '=============================='
