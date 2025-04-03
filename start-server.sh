#!/bin/bash
# Script pour démarrer l'application frontend en production

echo "Démarrage du serveur frontend..."
echo "Installation des dépendances..."
npm install
npm install serve

echo "Vérification du répertoire dist..."
if [ ! -d "dist" ]; then
  echo "Le répertoire dist n'existe pas. Lancement du build..."
  npm run build
fi

echo "Vérification des ports ouverts..."
netstat -tulpn | grep 6608

echo "Redémarrage de PM2..."
pm2 delete solana-tracker-frontend
pm2 start ecosystem.config.js

echo "Logs PM2..."
pm2 logs solana-tracker-frontend --lines 20 