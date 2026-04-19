# 📦 SLD Format Specification (Version 1.0)

## 1. Überblick

Das **SLD-Format** ist ein offenes, ZIP-basiertes Containerformat für browserbasierte Slideshows mit optionalem Audio.

Ziel ist ein leichtgewichtiger, portabler Standard für:

* Präsentationen
* Slidecasts (Slides + Audio)
* Offline-fähige Lerninhalte

---

## 2. Dateiendung

```
.sld
```

---

## 3. MIME-Type (Vorschlag)

```
application/vnd.sld.slideshow+zip
```

Alternative (fallback):

```
application/zip
```

---

## 4. Containerformat

Eine `.sld`-Datei ist technisch ein:

* ZIP-Archiv (kein spezielles Binary-Format)

---

## 5. Verzeichnisstruktur

Minimal erforderlich:

```
/
├── slides.json
├── slide1.md
├── slide2.md
```

Optional:

```
/
├── slides.json
├── slides/
│   ├── slide1.md
│   └── slide2.md
├── audio/
│   ├── slide1.mp3
│   └── slide2.ssml
├── assets/
│   ├── image1.png
│   └── diagram.svg
```

---

## 6. Pflichtdatei: slides.json

### Struktur

```json
{
  "title": "Beispiel Slideshow",
  "version": "1.0",
  "slides": [
    {
      "id": "intro",
      "content": "slides/intro.md",
      "audio": "audio/intro.mp3",
      "showtime": 10
    }
  ]
}
```

---

## 7. Felder

### Root-Level

| Feld      | Pflicht   | Beschreibung           |
| --------- | --------- | ---------------------- |
| `title`   | optional  | Titel der Präsentation |
| `version` | empfohlen | SLD-Spec-Version       |
| `slides`  | ja        | Liste der Folien       |

---

### Slide-Objekt

| Feld       | Pflicht  | Beschreibung          |
| ---------- | -------- | --------------------- |
| `id`       | optional | eindeutige ID         |
| `content`  | ja       | Pfad zur Inhaltsdatei |
| `audio`    | optional | Audioquelle           |
| `showtime` | optional | Dauer in Sekunden     |

**Regel:**
Mindestens eines muss vorhanden sein:

* `audio`
* oder `showtime`

---

## 8. Inhaltsformate

### 8.1 Markdown (`.md`)

Standardformat für Folieninhalte.

### 8.2 Wiki-Markup (`.wm`)

Alternative einfache Syntax.

---

## 9. Audioformate

### Unterstützt:

* `.mp3`
* `.wav`
* `.ogg`

### Textbasierte Formate:

* `.txt`
* `.ssml`

Verhalten:

* `.ssml` → TTS mit Struktur
* `.txt` → einfacher TTS

---

## 10. Asset-Auflösung

Alle Pfade sind:

* relativ zur `slides.json`
* innerhalb des Archivs

---

## 11. Abspielregeln

### Priorität

1. Audio vorhanden → abspielen
2. kein Audio → showtime verwenden

### Autoplay

* optional durch Viewer gesteuert
* basiert auf `showtime` oder Audio-Ende

---

## 12. Fehlerbehandlung

Empfohlene Fallbacks:

| Problem             | Verhalten                   |
| ------------------- | --------------------------- |
| fehlende Datei      | Fehlermeldung + Platzhalter |
| Audio fehlt         | showtime nutzen             |
| TTS nicht verfügbar | showtime nutzen             |

---

## 13. Versionierung

### Aktuelle Version

```
1.0
```

### Strategie

* Breaking Changes → Major erhöhen
* Erweiterungen → Minor erhöhen

---

## 14. Erweiterbarkeit

Zukünftige Felder könnten sein:

```json
{
  "theme": "dark",
  "transition": "fade",
  "author": "Name",
  "language": "de"
}
```

---

## 15. Kompatibilität

Ein Viewer sollte:

* unbekannte Felder ignorieren
* bekannte Felder strikt interpretieren

---

## 16. Sicherheit

* Markdown sollte sanitisiert werden
* externe Inhalte nur mit Vorsicht laden
* Remote-Zugriffe unterliegen CORS

---

## 17. Ziel des Formats

SLD ist gedacht als:

* offener Standard
* einfach erstellbar
* leicht versionierbar (Git)
* ohne Vendor Lock-in

---

## 18. Abgrenzung

| Format     | Unterschied                       |
| ---------- | --------------------------------- |
| PowerPoint | proprietär                        |
| PDF        | statisch                          |
| Video      | nicht interaktiv                  |
| SLD        | strukturiert + interaktiv + offen |

---

## 19. Referenzimplementierung

Viewer:

* https://github.com/Huluvu424242/sld-slideshow-viewer

---

## 20. Status

**Status:** Draft / Experimental
**Ziel:** Stabilisierung durch reale Nutzung

---
