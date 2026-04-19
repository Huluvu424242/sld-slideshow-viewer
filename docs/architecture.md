# Architektur

## Grundidee

Die Anwendung ist bewusst als reine statische Browser-Anwendung aufgebaut.

- kein Backend
- keine Datenbank
- deploymentfähig auf GitHub Pages
- lokale Nutzung per Verzeichnis oder ZIP

## Module

### `src/app.js`

Zentrale UI-Logik:

- Event-Handler
- Foliennavigation
- Laden der Slideshow
- Zusammenspiel von Renderer und Audio

### `src/loaders.js`

Abstraktion für Datenquellen:

- lokales Verzeichnis
- lokales ZIP
- Remote-Manifest
- Remote-ZIP

Die Loader liefern ein einheitliches Deck-Objekt mit:

- Metadaten
- geladenen Folieninhalten
- Asset-Resolver
- Audiozugriff

### `src/wiki-parser.js`

Renderer für:

- Markdown via `marked`
- vereinfachtes Wiki-Markup (`.wm`)

### `src/audio.js`

Audio-Abstraktion für:

- Browser-TTS
- SSML-Abbau auf sprechbaren Text
- MP3-Wiedergabe

## Wichtige technische Entscheidungen

### 1. ZIP-Unterstützung im Browser

ZIP-Dateien werden im Browser mit `JSZip` gelesen. Dadurch bleibt die App serverlos.

### 2. Lokales Verzeichnis

Das Öffnen lokaler Verzeichnisse nutzt die File System Access API. Das ist praktisch, aber nicht in jedem Browser verfügbar.

### 3. Audio

Für MP3 nutzt das Gerüst absichtlich die eingebaute Browser-Audiowiedergabe statt sich an eine alte, archivierte Spezialbibliothek zu koppeln. Popcorn.js wurde von Mozilla archiviert und ist seit dem 29. Juni 2018 read-only. citeturn331253search2turn331253search6

### 4. SSML

Die Browser-TTS-APIs sind uneinheitlich. Deshalb behandelt das Gerüst SSML pragmatisch: Tags werden entfernt und der verbleibende Text gesprochen. Das ist als Startpunkt brauchbar, aber noch kein vollständiger SSML-Interpreter.

## Erweiterungspunkte

- Sprecherstimmen auswählbar machen
- Wiedergabezeiten je Folie messen
- Synchronisation von Audio und Animationen
- Speaker-Notes
- ZIP-Export aus dem Browser
- Editor-Modus zusätzlich zum Viewer
