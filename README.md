# slideshow-viewer

Statisches Browser-Grundgerüst für dein Slideshow-Projekt.

## Ziel

Die Anwendung lädt eine Slideshow aus:

- lokalem Verzeichnis
- lokalem ZIP-Archiv
- Remote-URL zu `slides.json`
- Remote-URL zu einem ZIP-Archiv

Unterstützte Folienformate:

- Markdown (`.md`)
- einfaches Wikimedia/Wiki-Markup (`.wm`)

Unterstützte Audioarten:

- `txt` → Browser Text-to-Speech
- `ssml` → Browser Text-to-Speech mit einfachem SSML-Strip/Abbau auf sprechbaren Text
- `mp3` → Wiedergabe im Browser über `HTMLAudioElement`

## Start lokal

Da Browser für Module, Fetch und lokale Dateien Einschränkungen haben, sollte die App über einen kleinen HTTP-Server laufen.

### Variante A: VS Code / IntelliJ / ähnlicher Webserver

Projektordner öffnen und als statische Seite bereitstellen.

### Variante B: Python

```bash
python -m http.server 8080
```

Dann im Browser öffnen:

```text
http://localhost:8080
```

## Deploy auf GitHub Pages

Ein einfacher GitHub-Actions-Workflow ist enthalten.

## Dokumentation

- `docs/architecture.md`
- `docs/manifest.md`
- `docs/roadmap.md`

## Beispiel

Unter `example/` liegt eine kleine Beispieldatenbasis.

Für Remote-Tests kann die Datei `example/slides.json` direkt referenziert werden, sobald das Repo auf GitHub Pages liegt.
