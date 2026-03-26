# 🍺 Bier Counter – Setup Anleitung

## Schritt 1: Firebase Projekt erstellen

1. Geh zu [https://console.firebase.google.com](https://console.firebase.google.com)
2. Klick **"Projekt erstellen"** → Name eingeben (z.B. `bier-counter`)
3. Google Analytics: kannst du **deaktivieren**
4. Projekt erstellen & warten

## Schritt 2: Realtime Database aktivieren

1. Im Firebase-Seitenmenü: **Build → Realtime Database**
2. **"Datenbank erstellen"** klicken
3. Standort wählen: `europe-west1 (Belgium)` 
4. Sicherheitsregeln: **"Im Testmodus starten"** auswählen ✅
5. **Fertig stellen**

> ⚠️ Testmodus gilt 30 Tage. Danach musst du die Regeln anpassen (siehe unten).

## Schritt 3: Firebase Config kopieren

1. Im Firebase-Projekt: Klick auf das **Zahnrad ⚙** oben links → **Projekteinstellungen**
2. Scrolle nach unten zu **"Deine Apps"**
3. Klick auf das **`</>`** Web-Symbol
4. App-Nickname eingeben (egal was) → **App registrieren**
5. Du siehst jetzt so einen Block:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "bier-counter-xyz.firebaseapp.com",
  databaseURL: "https://bier-counter-xyz-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "bier-counter-xyz",
  storageBucket: "bier-counter-xyz.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Schritt 4: Config in index.html eintragen

Öffne `index.html` in einem Texteditor, suche den Abschnitt:

```javascript
const firebaseConfig = {
  apiKey:            "DEIN_API_KEY",
  ...
```

Ersetze alle Werte mit deinen echten Werten aus Schritt 3.

## Schritt 5: Auf GitHub Pages hosten

1. Erstelle ein neues **GitHub Repository** (z.B. `bier-counter`)
2. Lade `index.html` hoch (einfach per Drag & Drop auf GitHub)
3. Geh zu **Settings → Pages**
4. Source: **Deploy from a branch** → Branch: `main` → Ordner: `/ (root)`
5. Speichern – nach ~1 Minute ist die Seite live unter:
   `https://DEIN-USERNAME.github.io/bier-counter/`

## Schritt 6: Benutzen!

### Handy-Ansicht (jeder Trinker):
1. Seite öffnen → **Setup-Tab**
2. Session-Name eingeben → **START** (macht eine neue Session)
   ODER Session-ID eingeben + eigenen Namen → **BEITRETEN**
3. Auf **Zähler-Tab** wechseln
4. **+ BIER** tippen wenn ein Bier leer ist 🍺

### PC-Ansicht (Gesamtübersicht):
1. Gleiche URL öffnen
2. Session beitreten (oder erstellen)
3. **Dashboard-Tab** öffnen → alle Spieler + Gesamtcount live

## Sicherheitsregeln nach 30 Tagen

In Firebase → Realtime Database → Regeln → folgendes eintragen:

```json
{
  "rules": {
    "sessions": {
      "$session_id": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

---

## Tipps

- Die Session-ID (6 Buchstaben) an alle Mitspieler schicken
- Browser speichert Name + Session automatisch (localStorage)
- Glasfüllstand zeigt relativen Fortschritt (max. Anzeige = 20 Bier)
- Bei 0 Bier ist das Glas leer dargestellt
- Krone 👑 beim Führenden im Dashboard
