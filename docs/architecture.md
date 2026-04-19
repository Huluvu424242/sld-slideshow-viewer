# Architektur

## Grundidee

Die Anwendung ist bewusst als rein statische Browser-Anwendung aufgebaut:

- kein Backend
- keine Datenbank
- deploymentfähig auf GitHub Pages
- lokale Nutzung per Verzeichnis oder SLD/ZIP

## Module

### `src/app.js`

Zentrale UI- und Ablaufsteuerung:

- Event-Handling und Navigation
- Laden der Slideshow über die Loader
- Synchronisation von Audio, Showtime und UI-Status

### `src/loaders.js`

Abstraktion für Datenquellen:

- lokales Verzeichnis
- lokales SLD/ZIP
- Remote-Manifest
- Remote-SLD/ZIP

Die Loader liefern ein einheitliches Deck-Objekt mit Folieninhalt, Metadaten und Asset-Resolver.

### `src/wiki-parser.js`

Renderer für:

- Markdown (`marked` + `DOMPurify`)
- vereinfachtes Wiki-Markup (`.wm`)

### `src/audio.js` und `src/transcript.js`

Audio- und Transkriptabstraktion für:

- Browser-TTS (Text/SSML)
- MP3-/Audio-Playback
- Fallbacks und Anzeige von Audioinhalt im Transcript-Panel

### `src/layout.js`, `src/icons.js`, `src/swipe.js`, `src/error.js`

UI-Helfermodule für:

- Layout/Toolbar/Countdown
- Icon-Initialisierung
- Touch-/Swipe-Bedienung
- konsistente Fehlerdarstellung

## Wichtige technische Entscheidungen

1. **ZIP-Unterstützung im Browser:** SLD/ZIP werden im Browser mit `JSZip` gelesen.
2. **Lokales Verzeichnis:** Öffnen über File System Access API (v. a. in Chromium-basierten Browsern).
3. **Audio-Wiedergabe:** Native Browser-Audio- und TTS-APIs statt zusätzlicher Legacy-Abhängigkeiten.
4. **SSML-Strategie:** Der Viewer nutzt eine pragmatische SSML-Verarbeitung als robusten Startpunkt.

## Erweiterungspunkte

- Sprecherstimmen auswählbar machen
- Wiedergabezeiten je Folie messen
- Synchronisation von Audio und Animationen
- Speaker-Notes
- ZIP-Export aus dem Browser
- Editor-Modus zusätzlich zum Viewer
