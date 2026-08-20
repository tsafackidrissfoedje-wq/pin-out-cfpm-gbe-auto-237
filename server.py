#!/usr/bin/env python3
"""
PIN OUT CFPM GBE AUTO 237 - Serveur Local & Lanceur Pro
Base de données électronique & brochages calculateurs moteur
934+ schémas & pinouts haute définition hors-ligne
"""

import http.server
import socketserver
import os
import sys
import socket
import webbrowser
import mimetypes

PORT = 8095
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('text/html', '.html')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('application/manifest+json', '.json')

class PinoutHttpHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        sys.stderr.write(f"[PIN OUT 237] {self.address_string()} - {args[0]}\n")

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def start_server():
    os.chdir(DIRECTORY)
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(("", PORT), PinoutHttpHandler) as httpd:
        local_ip = get_local_ip()
        print("=" * 68)
        print("  ⚡ PIN OUT CFPM GBE AUTO 237 - BASE DE DONNÉES CALCULATEURS PRO ⚡")
        print("  Schémas & Brochages calculateurs (EDC17, PCR2.1, SID, BSL, Bench)")
        print("=" * 68)
        print(f"\n  🚀 Serveur démarré avec succès !")
        print(f"  👉 Sur cet appareil (Termux/Local) : http://127.0.0.1:{PORT}")
        print(f"  📱 Depuis un autre smartphone / PC : http://{local_ip}:{PORT}")
        print(f"\n  Appuyez sur Ctrl+C pour arrêter le serveur.")
        print("=" * 68 + "\n")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nArrêt du serveur PIN OUT CFPM GBE AUTO 237.")

if __name__ == "__main__":
    start_server()
