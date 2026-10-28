# 🍺 Bier Counter

Live-Zähler für die Leiterrunde: Bier, Kippen, Klo- und Raucherpausen zählen, mit Dashboard, Statistiken, Meilensteinen und Beamer-Modus.
Läuft komplett statisch auf GitHub Pages, die Daten liegen in der Firebase Realtime Database.

## Features

- **Zähler** (Handy): großer „+ Bier“-Button, „+1 Kippe“, Klo-Pause und Raucherpause mit Live-Timer, Rückgängig-Buttons, persönliches Ziel
- **Raucherpause** zählt automatisch eine Zigarette mit
- **Meilensteine**: Konfetti und Overlay bei jedem 5. Bier, Gruppen-Feier bei jedem leeren Kasten (20 Bier)
- **Dashboard**: Rangliste mit animierten Gläsern, wer gerade auf Klo oder rauchen ist, Liter, Kasten-Fortschritt, Live-Ticker
- **Beamer-Modus**: Vollbild ohne Navigation, der Bildschirm bleibt an
- **Statistik**: Kennzahlen, „Bier-Rennen“-Diagramm über den Abend, Titel des Abends (Bierkönig, Kettenraucher, Klo-König, …), Detailtabelle mit Abzeichen
- **Einladen per Link** (`?s=SESSIONID`) und auf den Homescreen legen (PWA)

## Projektstruktur

```
index.html                  Nur Markup – GitHub Pages braucht sie im Root
manifest.webmanifest        PWA-Manifest (Homescreen-Icon, Vollbild)
database.rules.json         Firebase-Sicherheitsregeln zum Reinkopieren
icons/                      App-Icons
css/
  base.css                  Farben/Tokens, Reset, Navigation, Layout
  components.css            Buttons, Karten, Formulare, Toast, Bierglas
  views.css                 Styles der vier Ansichten + Beamer-Modus
  effects.css               Animationen, Konfetti, Meilenstein-Overlay
js/
  app.js                    Einstieg: verbindet Store, Firebase und Views
  config/firebase-config.js 🔧 Firebase-Zugangsdaten
  services/firebase.js      Firebase-Initialisierung
  services/session-service.js  Alle Datenbank-Zugriffe
  core/constants.js         Event-Typen, Meilensteine, Farben
  core/store.js             App-Zustand (Session, Spieler, Daten)
  core/stats.js             Statistiken, Abzeichen, Titel (reine Logik)
  ui/dom.js                 DOM-Helfer, Formatierung, Live-Timer
  ui/glass.js               Animiertes Bierglas
  ui/effects.js             Konfetti, Overlay, Vibration
  ui/charts.js              Bier-Rennen-Diagramm
  ui/toast.js               Kurze Hinweise
  ui/views/*.js             Setup, Zähler, Dashboard, Statistik
```

Kein Build-Schritt nötig: Die Dateien werden als native ES-Module direkt vom Browser geladen.

## Datenmodell

```
sessions/{SESSIONID}
  name, createdAt
  players/{Name}
    count      Anzahl Bier
    cigs       Anzahl Zigaretten
    joinedAt
    status     { type: "toilet" | "smoke", since } während einer Pause
  events/{pushId}
    { type: "beer" | "cig", player, ts }
    { type: "toilet" | "smoke", player, ts, end }   abgeschlossene Pausen
```

Zähler und Event werden immer zusammen in einem atomaren Update geschrieben (`increment`), damit gleichzeitige Klicks nichts verschlucken.
Alte Sessions, die nur `count` haben, funktionieren weiter. Für sie fehlen nur die Zeitverläufe.

## Setup

### 1. Firebase-Projekt

1. [Firebase Console](https://console.firebase.google.com) → **Projekt erstellen** (Analytics kann aus)
2. **Build → Realtime Database → Datenbank erstellen**, Standort `europe-west1`
3. **Projekteinstellungen → Deine Apps → `</>` Web-App** registrieren und die Config kopieren
4. Die Werte in **`js/config/firebase-config.js`** eintragen

### 2. Sicherheitsregeln

In Firebase → Realtime Database → **Regeln** den Inhalt von [`database.rules.json`](database.rules.json) einfügen und veröffentlichen.

### 3. GitHub Pages

**Settings → Pages → Deploy from a branch** → `main` / `(root)`. Nach ca. 1 Minute ist die Seite live.

### Lokal testen

ES-Module funktionieren nicht über `file://`, deshalb einen kleinen Server starten:

```bash
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen.

## Benutzen

1. **Setup**: Session-Namen eingeben → **Start**. Die Session-ID wird automatisch eingetragen.
2. Eigenen Namen eingeben → **Beitreten**
3. **Link teilen**: Die anderen öffnen den Link, geben ihren Namen ein und sind drin.
4. **Zähler** am Handy, **Dashboard** am Laptop oder Beamer, **Statistik** für die Auswertung
