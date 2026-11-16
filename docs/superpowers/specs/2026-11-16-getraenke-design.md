# Getränke: Ein-Getränk-Abend und gemischter Abend

Stand: 16.11.2026

## Worum es geht

Bisher zählt die App nur Bier. Die Leiterrunde trinkt je nach Saison auch anderes
(Glühwein im Winter, Aperol im Sommer, Schnaps zwischendurch). Beim Erstellen einer
Session legt man deshalb künftig fest, was an dem Abend getrunken wird:

- **Ein Getränk** (z. B. „Glühwein-Abend“): funktioniert genau wie heute mit Bier,
  also mit Rangliste, Krone, Meilensteinen, Abzeichen, Titeln und Bier-Rennen.
  Überall steht nur der Name des gewählten Getränks statt „Bier“.
- **Gemischter Abend**: Hier wird nichts gerankt, weil verschiedene Getränke nicht fair
  vergleichbar sind. Es gibt nur eine Übersicht, wer was getrunken hat und wie viel
  von jedem Getränk insgesamt weg ist.

Das neue Datenmodell ist gleichzeitig die Grundlage für die geplanten Spiele: Die
Session wird später zur „Lobby“, in der man Spiele startet.

## Ziele

- Beim Erstellen einer Session: Modus und Getränk(e) wählen, bei Bier zusätzlich die Größe
- Ein-Getränk-Abend: alles wie heute, nur mit dem gewählten Getränk
- Gemischter Abend: schnell mehrere Getränke tracken, Übersicht pro Person und pro Getränk
- Kippen, Klo- und Raucherpause bleiben in beiden Modi unverändert
- Ein Datenmodell für beide Modi (siehe „Ansätze“)

## Nicht-Ziele

- Alte Sessions migrieren. Sie müssen nicht korrekt weiterlaufen, dürfen die App aber
  nicht zum Absturz bringen (siehe „Alte Sessions“)
- Modus oder Getränke während eines Abends wechseln (dafür neue Session aufmachen)
- Rangliste oder Titel im gemischten Modus
- Eigene, frei definierte Getränke (siehe „Dem Builder überlassen / später“)
- Je Getränk eine andere Glasform im SVG (siehe „Später“)

## Anti-Ziele

- Ein gemischter Abend, der doch heimlich wertet (z. B. eine Sortierung nach Menge,
  die wie ein Ranking aussieht)
- Der Ein-Getränk-Abend fühlt sich schlechter an als heute

## Ansätze

1. **Ein gemeinsames Datenmodell für beide Modi (gewählt).** Die Session speichert ihre
   Einstellung. Jede Person hat pro Getränk einen Zähler, jedes Ereignis weiß, welches
   Getränk es war. Ein Abend mit einem Getränk ist ein Abend mit genau einem Eintrag
   in der Getränkeliste. Ein Codepfad, größter Umbau, beste Grundlage für die Spiele.
2. Den heutigen `count` für den Ein-Getränk-Abend behalten und den gemischten Abend
   daneben bauen. Weniger Umbau, aber zwei Wege, Getränke zu speichern und
   anzuzeigen; jede spätere Erweiterung müsste doppelt gebaut werden.
3. Gemischter Abend als eigenes „Spiel“ auf der künftigen Startseite. Nimmt die
   Spiele-Plattform vorweg, und Spiele sollen ja *während* des Trackens laufen.

Gewählt wurde Ansatz 1, weil er spätere Erweiterungen am einfachsten macht.

## Entscheidungen der Leiterrunde

- Gemischter Abend: keine Rangliste, keine Krone, keine Titel, nur Übersicht
- Ein Getränk: wie heute gehandhabt, es wird nur dieses eine Getränk getrackt
- Bier: Größe beim Erstellen wählbar: 0,2 l Glas, 0,3 l Flasche, 0,5 l Flasche
- Andere Getränke: feste Standardmaße
- Modus wechseln mittendrin: nicht möglich
- Alte Sessions müssen nicht angepasst werden

## Getränke-Katalog

In `js/core/constants.js` als `DRINKS`. Pro Getränk: `id`, Name, Plural, Symbol,
Größe in Litern, Flüssigkeitsfarbe fürs Glas, ob Schaum angezeigt wird, Akkusativ
für den Ticker, Titel für den König.

| id | Name | Symbol | Größe | Schaum | Ticker | König |
|---|---|---|---|---|---|---|
| beer | Bier | 🍺 | wählbar 0,2 / 0,3 / 0,5 l (vorausgewählt 0,2) | ja | ein Bier | Bierkönig |
| gluehwein | Glühwein | ☕ | 0,2 l | nein | einen Glühwein | Glühweinkönig |
| aperol | Aperol Spritz | 🍹 | 0,2 l | nein | einen Aperol | Aperolkönig |
| wein | Wein | 🍷 | 0,2 l | nein | einen Wein | Weinkönig |
| sekt | Sekt | 🥂 | 0,1 l | nein | einen Sekt | Sektkönig |
| schnaps | Schnaps | 🥃 | 0,02 l | nein | einen Schnaps | Schnapskönig |
| longdrink | Longdrink | 🍸 | 0,3 l | nein | einen Longdrink | Longdrinkkönig |

*Meine Calls:* die Auswahl der Getränke, die Symbole (☕ für Glühwein, weil er im
Becher kommt und 🍷 schon für Wein steht), die Standardmaße und dass 0,2 l bei Bier
vorausgewählt ist (so trinkt ihr meistens). Alles steht an einer Stelle und ist
leicht zu ändern.

Der Kasten/Fässchen-Fortschritt (`BEERS_PER_CRATE`, aktuell 25 = „Fässchen“) gibt es
nur bei einem reinen Bier-Abend. Bei anderen Getränken entfallen Fässchen-Kachel und
Fässchen-Feier; Liter werden weiter angezeigt. *Mein Call:* Der Name „Fässchen“ wird
als Konstante `CRATE_NAME` geführt. Aktuell steht im Dashboard „Fässchen“, in der
Feier aber noch „Kasten Nr. …“; das wird dabei vereinheitlicht.

## Datenmodell

```
sessions/{id}
  name, createdAt
  config
    mode     "single" | "mixed"
    drinks   ["beer"]  bzw. ["beer", "schnaps", ...]   (Reihenfolge = Anzeige)
    beerSize 0.2 | 0.3 | 0.5                            (nur wenn beer dabei ist)
  players/{name}
    drinks   { beer: 3, schnaps: 1 }
    cigs, joinedAt, status                              (unverändert)
  events/{pushId}
    { type: "drink", drink: "beer", player, ts }        (neu, ersetzt type "beer")
    { type: "cig" | "toilet" | "smoke", ... }           (unverändert)
```

- Zähler und Event werden wie heute in einem atomaren Update mit `increment` geschrieben.
- Rückgängig entfernt das letzte passende Event und zählt den Zähler herunter.
- `config` wird beim Erstellen geschrieben und danach nie geändert.

### Alte Sessions

Hat eine Session kein `config`, wird sie als Bier-Abend mit 0,5 l behandelt, und ein
alter `count` gilt als `drinks.beer`; alte Events vom Typ `beer` zählen als
`drink`/`beer`. Das ist nur eine Absicherung gegen Abstürze an einer Stelle beim
Einlesen, keine Migration in der Datenbank.

## Setup

Die Karte „Neue Session“ bekommt unter dem Namen:

```
  Session-Name   [ Leiterrunde Advent        ]

  Was wird getrunken?
  ( ● Ein Getränk )  ( ○ Gemischt )

  🍺 Bier  ☕ Glühwein  🍹 Aperol  🍷 Wein  🥂 Sekt  🥃 Schnaps  🍸 Longdrink
  └─ Ein Getränk: genau eins wählbar · Gemischt: mehrere, vorausgewählt alle

  Biergröße  ( 0,2 l Glas ) ( 0,3 l Flasche ) ( 0,5 l Flasche )
  └─ nur sichtbar, wenn Bier gewählt ist

  [ START ]
```

*Mein Call:* Im gemischten Modus wählt man aus, welche Getränke es gibt (vorausgewählt:
alle), damit das Raster im Zähler nicht unnötig voll ist.

In der Box „Aktive Session“ steht zusätzlich, was getrunken wird, z. B.
„Glühwein-Abend“ oder „Gemischt: 🍺 🥃 🍷“, damit alle beim Beitreten sehen, worauf
sie sich einlassen.

## Zähler

**Ein Getränk:** wie heute. Statt „Bier“ steht überall der Getränkename
(„+ GLÜHWEIN“, „Glühwein getrunken“, „− 1 Glühwein“, „Ø 20 min pro Glühwein“,
Ziel in Glühwein). Das Glas nimmt die Farbe des Getränks an, Schaum nur bei Bier.
Die Farbe wird bei mehr Getränken weiterhin dunkler.

**Gemischt:**

```
            KAI
         7 Getränke
    🍺 3 · 🥃 2 · 🍷 2

  ┌────────┐ ┌────────┐ ┌────────┐
  │   🍺   │ │   🥃   │ │   🍷   │
  │  Bier  │ │Schnaps │ │  Wein  │
  │   3    │ │   2    │ │   2    │
  └────────┘ └────────┘ └────────┘

  [🚬 +1 Kippe] [🚽 Klo-Pause] [💨 Raucherpause]

        ↶ Letztes Getränk zurück · − 1 Kippe
```

- Große Getränkekacheln statt des einen „+ Bier“-Knopfs; Tippen zählt +1 mit dem
  gleichen Feedback wie heute („+1 🥃“ steigt auf, Vibration, Zahl hüpft)
- Kein großes Glas, kein Ziel, keine Tempo-Zeile, keine Abzeichen
- Rückgängig: „Letztes Getränk zurück“ entfernt das zuletzt eingetragene Getränk
  dieser Person, egal welches. *Mein Call*, weil es ohne Ziel-Auswahl auskommt und
  ein Vertipper fast immer das letzte Getränk betrifft.
- *Mein Call:* Meilenstein-Feier bei jedem 5. Getränk insgesamt bleibt, aber nur für
  einen selbst (kein Hinweis über andere, weil das wieder nach Wettbewerb aussieht).

## Dashboard

**Ein Getränk:** wie heute, mit Getränkename und Farbe. Fässchen-Kachel nur bei Bier.

**Gemischt:**

```
  LEITERRUNDE ADVENT                       [📺 Beamer-Modus]

  🍺 12   🥃 7   🍷 5   │  3,4 l gesamt  │  🚬 9

  ┌────────────┐ ┌────────────┐ ┌────────────┐
  │    KAI     │ │   LENA     │ │   TOM      │
  │ 🍺3 🥃2 🍷2│ │ 🍷3 🥃1    │ │ 🍺9 🥃4    │
  │ 🚬1  🚽1   │ │ 🚬0  🚽2   │ │ 🚬8  🚽0   │
  │ zuletzt 🥃 │ │ zuletzt 🍷 │ │ zuletzt 🍺 │
  │  vor 4 min │ │ vor 12 min │ │  vor 1 min │
  └────────────┘ └────────────┘ └────────────┘
```

- Karten in Beitrittsreihenfolge, keine Rangnummern, keine Krone, kein Glas
- Oben die Summen pro Getränk, Liter gesamt, Kippen
- Wer gerade auf Klo oder rauchen ist und der Ticker bleiben wie heute; der Ticker
  nennt das Getränk („Lena hat einen Wein aufgemacht“)
- Legende-Button nur, wenn es Abzeichen gibt (also nicht im gemischten Modus)

## Statistik

**Ein Getränk:** wie heute, mit Getränkename: Kacheln, Rennen, Titel (König heißt
nach dem Getränk, z. B. „Glühweinkönig“), Tabelle, Abzeichen.

**Gemischt:**

- Kacheln: pro Getränk die Anzahl, Liter gesamt, Kippen, Klogänge, Zeit auf Klo, Dauer
- Tabelle: Person × Getränk, dazu Kippen und Klogänge, in Beitrittsreihenfolge
- Kein Rennen-Diagramm, keine Titel, keine Abzeichen

## Abzeichen und Legende

Abzeichen gibt es nur beim Ein-Getränk-Abend. Ihre Texte enthalten den Getränkenamen
(„Erstes Glühwein des Abends“ klingt falsch, deshalb mit Artikel aus dem Katalog:
„Erster Glühwein des Abends“, „Erstes Bier des Abends“). *Mein Call:* Der Katalog
bekommt dafür die Felder, die die Texte brauchen (z. B. „Erstes Bier“ / „Erster
Glühwein“, Plural „Glühwein“). Die Legende zeigt die Texte für das Getränk der
aktuellen Session.

## Benachrichtigungen

- Meilensteine im Ein-Getränk-Abend wie heute, mit Getränkename („10. Glühwein“).
  *Mein Call:* Sprüche, die nur zu Bier passen (25 = „Fässchen geschafft“), gibt es
  nur beim Bier-Abend; sonst greift der allgemeine Spruch.
- Fässchen-Feier nur bei Bier
- Gemischt: siehe Zähler

## Was sich in den Dateien ändert

- `js/core/constants.js`: `DRINKS`, Biergrößen, `CRATE_NAME`; `LITERS_PER_BEER` entfällt
  (die Größe kommt aus der Session)
- `js/core/stats.js`: rechnet pro Getränk; Ranking, Titel, Abzeichen, Rennen nur im
  Ein-Getränk-Modus; liefert Modus und Getränke mit aus
- `js/services/session-service.js`: `createSession(name, config)`, `addDrink(id, player, drink)`,
  Rückgängig für Getränke
- `js/app.js`: Aktionen und Benachrichtigungen auf Getränke umstellen
- Views (Setup, Zähler, Dashboard, Statistik), `js/ui/legend.js`, `js/ui/glass.js`
  (Farbe, Schaum an/aus), `index.html`, CSS
- `README.md`: Datenmodell und Features

## Testen

- Neue Unit-Tests für `stats.js` mit Nodes eingebautem Testrunner (`node --test`),
  ohne zusätzliche Abhängigkeiten: Ein-Getränk-Abend (Ranking, Titel, Abzeichen mit
  anderem Getränk), gemischter Abend (Summen, keine Titel), alte Session ohne `config`
- Browser-Test wie bisher mit nachgebauter Datenbank: beide Modi einmal durchklicken,
  Screenshots auf Handy und Desktop, keine Konsolenfehler

## Dem Builder überlassen / später

- Eigene Getränke anlegen
- Glasformen je Getränk (Shotglas, Weinglas, Becher)
- Alkoholfreie Getränke (Wasser, Softdrinks)
