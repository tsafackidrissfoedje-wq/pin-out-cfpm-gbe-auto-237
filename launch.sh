#!/data/data/com.termux/files/usr/bin/bash
# =========================================================
# LANCEUR OFFICIEL - PIN OUT CFPM GBE AUTO 237
# =========================================================

DIR="/data/data/com.termux/files/home/pin-out-cfpm-gbe-auto-237"
PORT=8095
URL="http://127.0.0.1:${PORT}"

echo "========================================================="
echo "   ⚡ PIN OUT CFPM GBE AUTO 237 - CALCULATEURS & SCHÉMAS ⚡"
echo "   Base de données technique • 934+ brochages"
echo "========================================================="
echo ""
echo "Arrêt d'instances précédentes éventuelles..."
pkill -f "pin-out-cfpm-gbe-auto-237/server.py" 2>/dev/null || true
sleep 0.5

echo "Ouverture de votre navigateur Android..."
(sleep 1 && (am start -a android.intent.action.VIEW -d "$URL" 2>/dev/null || termux-open-url "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null)) &

echo "Démarrage du serveur local sur le port $PORT..."
cd "$DIR"
exec python3 server.py
