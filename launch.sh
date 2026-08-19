#!/data/data/com.termux/files/usr/bin/bash
# =========================================================
# LANCEUR RAPIDE - PIN OUT CFPM GBE AUTO 237
# =========================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "========================================================="
echo "   PIN OUT CFPM GBE AUTO 237 - CALCULATEURS & SCHÉMAS"
echo "   Base de données technique • 934+ brochages"
echo "========================================================="
echo ""
echo "Démarrage de l'application..."

# Try to open browser in Termux if termux-open-url exists
if command -v termux-open-url >/dev/null 2>&1; then
    (sleep 1 && termux-open-url "http://127.0.0.1:8095") &
fi

# Run python server
python3 "$DIR/server.py"
