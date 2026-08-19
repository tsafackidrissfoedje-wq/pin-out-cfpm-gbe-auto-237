# ⚡ PIN OUT CFPM GBE AUTO 237 (PRO v2.0)

> **Base de Données Professionnelle & Interactive de Brochages et Schémas de Raccordement Calculateurs Moteur (ECU / TCU / BCM)**  
> Conçue pour les techniciens diagnostic automobile, électriciens auto et spécialistes chiptuning / clonage calculateurs.

---

## 🌟 Fonctionnalités Principales

- **⚡ 934+ Calculateurs Indexés** :
  - **Bosch** : EDC17 (EDC17C10, EDC17C50, EDC17CP14...), EDC16 (EDC16C34, EDC16C39...), ME7, MED17, MD1, MG1...
  - **Continental / Siemens** : SID807, SID310, SID208, PCR2.1, SIMOS...
  - **Delphi** : DCM3.7, DCM6.2, CRD2, CRD3...
  - **Magneti Marelli** : IAW 5SF, 6LPB, 8GM, MJD 6F3, 8F3, 9DF...
  - **Denso & ACDelco** : D-Max, Hilux, E83, E78...
- **🔍 Moteur de Recherche Multi-Critères Ultra-Rapide** :
  - Recherche instantanée par **Marque** (Peugeot, BMW, Renault, Toyota, Mercedes...), **Modèle**, **Référence ECU**, **MCU** ou **Motorisation**.
  - Filtres combinables par fabricant de calculateur, famille, mode de connexion et carburant (Diesel / Essence).
- **🔎 Visionneuse Haute Définition Interactive** :
  - Zoom fluide (jusqu'à 500%) et déplacement libre (Pan & Drag à la souris ou au doigt).
  - Mode **Contraste Inversé** pour une lisibilité parfaite des pistes électroniques et pastilles de boot.
  - Sélecteur multi-vues (vue connecteur, vue carte mère PCB, vue boot pin).
  - Téléchargement direct des images en pleine résolution.
- **🔌 Tableaux de Câblage Détaillés** :
  - Repérage des broches (+12V permanent, +15 contact APC, Masses GND, Bus CAN-H / CAN-L, K-Line, GPT1/GPT2, Boot BSL).
  - Code couleur normalisé des faisceaux et bouton de copie rapide.
- **⭐ Système de Favoris & Notes d'Atelier** :
  - Sauvegarde locale des calculateurs favoris.
  - Bloc-notes intégré pour conserver vos réglages d'alimentation et résistances de boot.
- **🧰 Boîte à Outils Électronique** :
  - Schéma de brochage standard OBD-II (16 broches).
  - Guide des valeurs de résistances de boot (1kΩ, 560Ω, 100Ω...).
  - Consignes de stabilité de tension pour banc d'essai (13.8V).
- **📱 100% Hors-Ligne & PWA** :
  - Fonctionne entièrement sans connexion Internet une fois chargé grâce au Service Worker.
  - Installable directement sur smartphone Android ou tablette via « Ajouter à l'écran d'accueil ».

---

## 🚀 Démarrage Rapide

### Sur Termux (Android)

Pour lancer le serveur local et ouvrir l'application sur votre appareil :

```bash
./pinout.sh
```

Ou directement depuis le dossier du projet :

```bash
cd ~/pin-out-cfpm-gbe-auto-237
python3 server.py
```

L'application est immédiatement accessible à l'adresse :  
👉 **`http://127.0.0.1:8095`**

### Accès depuis un autre smartphone ou PC sur le même réseau Wi-Fi / Point d'accès

Le terminal affiche automatiquement votre adresse IP locale lors du démarrage (ex: `http://192.168.43.1:8095`). Entrez cette URL dans le navigateur de votre deuxième appareil.

---

## 📂 Structure du Projet

```text
pin-out-cfpm-gbe-auto-237/
├── index.html                  # Interface utilisateur principale
├── manifest.json               # Manifeste PWA pour installation Android
├── sw.js                       # Service Worker pour fonctionnement hors-ligne
├── server.py                   # Serveur HTTP local Python
├── launch.sh                   # Script de lancement Termux avec auto-ouverture
├── css/
│   └── style.css               # Design sombre moderne (Glassmorphism & animations)
├── js/
│   ├── app.js                  # Logique applicative, moteur de recherche et visionneuse
│   └── data.js                 # Base de données complète des calculateurs (934+ entrées)
├── assets/
│   ├── icon.svg                # Logo vectoriel officiel de l'application
│   └── images/                 # Schémas techniques & photos HD de brochage
└── .github/
    └── workflows/
        └── deploy-pages.yml    # Déploiement automatique GitHub Pages
```

---

## 🛠️ Développé pour

**CFPM GBE AUTO 237**  
*Centre de Formation Professionnelle aux Métiers de l'Automobile*  
Expertise en Électronique Automobile, Diagnostic Avancé, Reprogrammation & Réparation Calculateurs.
