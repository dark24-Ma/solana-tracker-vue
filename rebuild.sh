#!/bin/bash
# Script pour reconstruire l'application avec la nouvelle API Dexscreener

echo "🔄 Reconstruction de l'application avec l'API Dexscreener..."

# Installer les dépendances si nécessaire
echo "📦 Vérification des dépendances..."
npm install

# Arrêter l'application PM2 existante
echo "🛑 Arrêt de l'application en cours..."
pm2 delete solana-tracker-frontend

# Construire l'application pour la production
echo "🏗️ Build pour la production..."
npm run build

# Démarrer l'application avec PM2
echo "🚀 Démarrage de l'application avec PM2..."
pm2 start ecosystem.config.js

# Afficher les logs
echo "📋 Logs de l'application..."
pm2 logs solana-tracker-frontend --lines 20

echo "✅ Application reconstruite et redémarrée avec succès!"
echo "👉 Accédez à l'application sur http://localhost:6608" 