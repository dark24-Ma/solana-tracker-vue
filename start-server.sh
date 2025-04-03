#!/bin/bash
# Script pour démarrer l'application frontend en production

echo "Démarrage du serveur frontend..."
echo "Vérification du répertoire dist..."
if [ ! -d "dist" ]; then
  echo "Le répertoire dist n'existe pas. Lancement du build..."
  npm run build
fi

echo "Vérification des ports ouverts..."
netstat -tulpn | grep 6608

echo "Démarrage du serveur sur 0.0.0.0:6608..."
npx serve -s dist -l 6608 --single --debug --listen tcp://0.0.0.0:6608 