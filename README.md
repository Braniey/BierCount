# 🍺 Bier Counter

Live-Zähler für die Leiterrunde: Getränke, Kippen, Klo- und Raucherpausen zählen, mit Dashboard, Statistiken, Meilensteinen und Beamer-Modus.
Läuft komplett statisch auf GitHub Pages, die Daten liegen in der Firebase Realtime Database.

## Features

### Zwei Arten von Abend

Beim Erstellen einer Session legt man fest, was getrunken wird. Wechseln geht danach nicht – dafür einfach eine neue Session aufmachen.

| | Ein Getränk | Gemischt |
|---|---|---|
| Beispiel | Bier-Abend, Glühwein-Abend | Bier, Schnaps und Wein durcheinander |
| Zähler | Ein großer „+ Glühwein“-Knopf mit Glas | Eine Kachel pro Getränk |
| Rangliste & Krone | ✅ | – |
| Titel des Abends & Abzeichen | ✅ | – |
| Meilensteine | jedes 5. Getränk, auch Hinweise über andere | nur die eigenen |
| Rennen-Diagramm | ✅ | – |
| Übersicht wer was getrunken hat | ✅ | ✅ |

Getränke und Größen:

| Getränk | Größe |
|---|---|
| 🍺 Bier | wählbar: 0,2 l Glas · 0,3 l Flasche · 0,5 l Flasche |
| ☕ Glühwein | 0,2 l |
| 🍹 Aperol Spritz | 0,2 l |
| 🍷 Wein | 0,2 l |
| 🥂 Sekt | 0,1 l |
| 🥃 Schnaps | 2 cl |
| 🍸 Longdrink | 0,3 l |

Beim Bier-Abend gibt es zusätzlich den **Fässchen-Fortschritt** (25 Bier) mit Feier für alle.

### Für alle Abende

- **Zähler** (Handy): Getränke, „+1 Kippe“, Klo-Pause und Raucherpause mit Live-Timer, Rückgängig-Buttons
- **Raucherpause** zählt automatisch eine Zigarette mit
- **Dashboard**: wer gerade auf Klo oder rauchen ist, Liter, Kippen, Live-Ticker
- **Beamer-Modus**: Vollbild ohne Navigation, der Bildschirm bleibt an
- **Statistik**: Kennzahlen und Detailtabelle pro Person
- **Legende**: erklärt alle Abzeichen und Titel (Antippen eines Abzeichens genügt)
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
  core/constants.js         Getränke, Meilensteine, Abzeichen, Titel, Farben
  core/session-config.js    Liest eine Session ein (auch alte ohne Getränke-Einstellung)
  core/store.js             App-Zustand (Session, Spieler, Daten)
  core/stats.js             Statistiken, Rangliste, Abzeichen, Titel (reine Logik)
  core/undo.js              Welches Getränk „Rückgängig“ zurücknimmt
  ui/dom.js                 DOM-Helfer, Formatierung, Live-Timer
  ui/glass.js               Animiertes Glas (Farbe, Schaum, Bläschen je Getränk)
  ui/effects.js             Konfetti, Overlay, Vibration
  ui/charts.js              Rennen-Diagramm
  ui/legend.js              Legende der Abzeichen und Titel
  ui/toast.js               Kurze Hinweise
  ui/views/*.js             Setup, Zähler, Dashboard, Statistik
```

Kein Build-Schritt nötig: Die Dateien werden als native ES-Module direkt vom Browser geladen.

## Datenmodell

```
sessions/{SESSIONID}
  name, createdAt
  owner        Kennung (uid) des Handys, das die Session erstellt hat
  config
    mode       "single" | "mixed"
    drinks     ["beer"] bzw. ["beer", "schnaps", …]
    beerSize   0.2 | 0.3 | 0.5          (nur wenn Bier dabei ist)
  players/{Name}
    uid        Kennung des Handys, dem der Name gehört
    drinks     { beer: 3, schnaps: 1 }
    cigs       Anzahl Zigaretten
    joinedAt
    status     { type: "toilet" | "smoke", since } während einer Pause
  events/{pushId}
    { type: "drink", drink: "beer", player, ts }
    { type: "cig", player, ts }
    { type: "toilet" | "smoke", player, ts, end }   abgeschlossene Pausen
```

Zähler und Event werden immer zusammen in einem atomaren Update geschrieben (`increment`), damit gleichzeitige Klicks nichts verschlucken.
Die `config` wird beim Erstellen geschrieben und danach nicht mehr geändert.
Alte Sessions ohne `config` werden als Bier-Abend (0,5 l) angezeigt.

### Wer darf was?

Jedes Handy meldet sich beim Öffnen unsichtbar bei Firebase an (anonyme Anmeldung, kein Passwort) und bekommt eine eigene Kennung. Die Regeln in [`database.rules.json`](database.rules.json) sorgen dafür, dass

- nur angemeldete Handys lesen und schreiben können,
- jeder nur **seinen eigenen** Namen zählen, pausieren und zurücknehmen kann,
- Session-Name und Getränke nach dem Erstellen fest sind und niemand eine Session löschen kann,
- nur gültige Werte gespeichert werden (Zahlen, bekannte Ereignisse, Namen bis 20 Zeichen),
- nur der **Ersteller** einen Namen wieder freigeben kann (z. B. wenn jemand das Handy wechselt).

## Setup

### 1. Firebase-Projekt

1. [Firebase Console](https://console.firebase.google.com) → **Projekt erstellen** (Analytics kann aus)
2. **Build → Realtime Database → Datenbank erstellen**, Standort `europe-west1`
3. **Projekteinstellungen → Deine Apps → `</>` Web-App** registrieren und die Config kopieren
4. Die Werte in **`js/config/firebase-config.js`** eintragen

### 2. Anonyme Anmeldung

**Build → Authentication → Jetzt starten → Sign-in method → Anonym → Aktivieren → Speichern**

### 3. Sicherheitsregeln

In Firebase → Realtime Database → **Regeln** den Inhalt von [`database.rules.json`](database.rules.json) einfügen und veröffentlichen.
Erst machen, wenn die aktuelle Version der Website online ist – ältere Versionen melden sich nicht an und würden ausgesperrt.

### 4. GitHub Pages

**Settings → Pages → Deploy from a branch** → `main` / `(root)`. Nach ca. 1 Minute ist die Seite live.

### Lokal testen

ES-Module funktionieren nicht über `file://`, deshalb einen kleinen Server starten:

```bash
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen.

## Benutzen

1. **Setup**: Session-Namen eingeben, **Ein Getränk** oder **Gemischt** wählen, Getränk(e) und ggf. Biergröße antippen → **Start**. Die Session-ID wird automatisch eingetragen.
2. Eigenen Namen eingeben → **Beitreten**
3. **Link teilen**: Die anderen öffnen den Link, geben ihren Namen ein und sind drin.
4. **Zähler** am Handy, **Dashboard** am Laptop oder Beamer, **Statistik** für die Auswertung

**Handy gewechselt oder Akku leer?** Der Name gehört dem Handy, mit dem man beigetreten ist. Der Ersteller der Session tippt im Setup unter „Wer bist du?“ beim Namen auf **Freigeben**. Danach kann man den Namen auf dem neuen Handy einfach wieder antippen. Der Zählerstand bleibt erhalten.
