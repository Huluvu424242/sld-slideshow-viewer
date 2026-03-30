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

## URL-Parameter

Wird die Anwendung mit `?url=...` aufgerufen, wird diese URL automatisch zum Laden der Slideshow verwendet.

Beispiele:

```text
https://<deine-pages-url>/index.html?url=https://example.org/slides/slides.json
```

```text
https://<deine-pages-url>/index.html?url=https://example.org/bundles/demo.zip
```

Der Wert darf also entweder direkt auf eine `slides.json` oder auf ein ZIP-Archiv zeigen.


## Dokumentation

- `docs/architecture.md`
- `docs/manifest.md`
- `docs/roadmap.md`

## Beispiel

Unter `example/` liegt eine kleine Beispieldatenbasis.

Für Remote-Tests kann die Datei `example/slides.json` direkt referenziert werden, sobald das Repo auf GitHub Pages liegt.


## UI-Hinweis

Die Hauptnavigation verwendet jetzt freie Inline-SVG-Icons statt Emojis. Dadurch sind Play und Nächste Folie klarer unterscheidbar und die Darstellung bleibt auf GitHub Pages ohne zusätzliche Bibliothek stabil.


## Verhalten bei Audiofehlern

Wenn eine Audiodatei nicht geladen werden kann, etwa wegen einer fehlenden Datei oder eines Netzwerkfehlers, spricht der Viewer automatisch den Satz `Die Audio Datei konnte nicht geladen werden.`

Der automatische Präsentationsmodus läuft danach weiter und springt wie gewohnt zur nächsten Folie.


## CORS beim Remote-Laden

Beim Laden einer Slideshow über eine Remote-URL gelten die normalen Browser-CORS-Regeln.

Das bedeutet praktisch:

- Remote-Laden funktioniert zuverlässig, wenn die Dateien vom gleichen Host bereitgestellt werden.
- Es funktioniert auch, wenn der entfernte Server passende CORS-Header setzt.
- Ohne passende Freigabe blockiert der Browser den Zugriff, auch wenn die URL technisch erreichbar ist.

Darum sollte die Oberfläche einen Hinweis anzeigen, dass Remote-Laden im Browser oft nur vom gleichen Host oder aus lokal freigegebenen Quellen möglich ist.


## Quellen im UI

Die Anwendung zeigt im Kopfbereich nicht nur einen kurzen Beschreibungstext, sondern zusätzlich direkte Links auf die bisherigen Projektquellen sowie auf die lokale Dokumentation:

- honey-slideshow
- foile-pile
- slidecast-angularjs.example
- eclipse-slideshow
- liona-slideshow
- README
- docs/architecture.md
- docs/manifest.md
- docs/roadmap.md

Dadurch ist der Viewer nicht nur ein Abspielgerüst, sondern zugleich ein nachvollziehbarer Einstiegspunkt in das Gesamtprojekt.


## Weitere Dokumentation

Zusätzlich zur Architektur-, Manifest- und Roadmap-Dokumentation enthält das Projekt nun auch eine Autorenanleitung:

- `docs/createslideshow.md`

Darin wird beschrieben, wie eine Slideshow aufgebaut ist, welche Dateiformate zulässig sind und wie typische Beispiele aussehen.


## Folien ohne Audio

Folien können jetzt auch ohne `audio`-Block definiert werden. In diesem Fall kann stattdessen `showtime` gesetzt werden.

Beispiel:

```json
{
  "content": "slide-ohne-audio.md",
  "showtime": 8
}
```

Im automatischen Modus bleibt die Folie dann 8 Sekunden sichtbar und die Wiedergabe läuft anschließend normal weiter.
