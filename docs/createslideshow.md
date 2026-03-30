# Create Slideshow

Diese Anleitung beschreibt, wie eine Slideshow für den Viewer aufgebaut wird.

Ziel ist es, mit minimalem Aufwand einen Foliensatz zu erstellen, der aus Text (Markdown oder Wiki) und optionalem Audio besteht.

---

## Grundprinzip

Eine Slideshow besteht aus:

- einem **Manifest** (`slides.json`)
- mehreren **Foliendateien** (`.md` oder `.wm`)
- optionalen **Audio-Dateien** (`.txt`, `.ssml`, `.mp3`)
- oder alternativ einem **`showtime`-Attribut** für Folien ohne Audio

Alle Dateien können in einem Verzeichnis oder in einem ZIP-Archiv liegen.

---

## Verzeichnisstruktur (Beispiel)

```text
my-slideshow/
├── slides.json
├── slide1.md
├── slide2.md
├── slide3.wm
├── audio1.txt
├── audio2.ssml
├── audio3.mp3
```

---

## Manifest: slides.json

Das Manifest beschreibt die Reihenfolge der Folien und deren Inhalte.

### Beispiel

```json
{
  "title": "Meine erste Slideshow",
  "slides": [
    {
      "id": "slide1",
      "content": "slide1.md",
      "audio": {
        "type": "txt",
        "src": "audio1.txt"
      }
    },
    {
      "id": "slide2",
      "content": "slide2.md",
      "audio": {
        "type": "ssml",
        "src": "audio2.ssml"
      }
    },
    {
      "id": "slide3",
      "content": "slide3.wm",
      "audio": {
        "type": "mp3",
        "src": "audio3.mp3"
      }
    },
    {
      "id": "slide4",
      "content": "slide4.md",
      "showtime": 10
    }
  ]
}
```

---

## Unterstützte Folienformate

### 1. Markdown (`.md`)

Standardformat für Folien.

#### Beispiel

```markdown
# Titel der Folie

Dies ist ein Text mit **Markdown**.

- Punkt 1
- Punkt 2
```

---

### 2. Wiki-Format (`.wm`)

Ein einfaches Wiki-ähnliches Format.

#### Beispiel

```text
= Titel der Folie =

Dies ist ein einfacher Text.

* Punkt 1
* Punkt 2
```

---

## Folien ohne Audio

Nicht jede Folie benötigt eine Audiodatei. In diesem Fall wird der komplette `audio`-Block in `slides.json` weggelassen und stattdessen `showtime` gesetzt.

`showtime` definiert die Anzeigedauer der Folie in Sekunden.

### Beispiel

```json
{
  "id": "slide-ohne-audio",
  "content": "slide-ohne-audio.md",
  "showtime": 8
}
```

Verhalten:

- die Folie wird ohne Audio angezeigt
- im automatischen Modus bleibt sie für die angegebene Zeit sichtbar
- danach springt die Präsentation automatisch zur nächsten Folie

## Unterstützte Audioformate

### 1. Text (`.txt`)

Wird per Browser Text-to-Speech gesprochen.

#### Beispiel

```text
Willkommen zu meiner Präsentation.
```

---

### 2. SSML (`.ssml`)

Erweiterter Sprachtext mit Steuerung, zum Beispiel für Pausen oder Betonung.

#### Beispiel

```xml
<speak>
  Willkommen zu meiner Präsentation.
  <break time="500ms"/>
  Dies ist eine Pause.
</speak>
```

Hinweis:

- SSML wird aktuell vereinfacht interpretiert
- Nicht alle Tags werden vollständig unterstützt

---

### 3. MP3 (`.mp3`)

Vollwertige Audiodatei.

#### Vorteile

- beste Qualität
- volle Kontrolle über Timing und Stimme

---

## Verhalten bei fehlendem Audio

Wenn eine Audiodatei

- nicht existiert
- nicht geladen werden kann
- oder ein Fehler auftritt

wird automatisch gesprochen:

```text
Die Audio Datei konnte nicht geladen werden.
```

Die Präsentation läuft danach normal weiter.

---

## Laden der Slideshow

### Lokal

- Verzeichnis auswählen
- ZIP-Datei laden

### Remote

```text
index.html?url=https://example.org/slides/slides.json
```

Hinweis:

Browser-Sicherheitsregeln (CORS) beachten:

- funktioniert meist nur auf gleichem Host
- oder wenn der Server CORS erlaubt

---

## Best Practices

- kurze Folien mit klarer Struktur
- Audio pro Folie nicht zu lang
- MP3 für finale Präsentationen verwenden
- TXT oder SSML für schnelle Entwürfe

---

## Minimalbeispiel

**slides.json**

```json
{
  "title": "Demo",
  "slides": [
    {
      "content": "slide.md",
      "audio": {
        "type": "txt",
        "src": "audio.txt"
      }
    }
  ]
}
```

**slide.md**

```markdown
# Hallo Welt

Dies ist meine erste Folie.
```

**audio.txt**

```text
Hallo Welt. Dies ist meine erste Folie.
```

---

## Fazit

Eine Slideshow ist bewusst simpel gehalten:

- Text plus Audio
- keine komplexe Build-Pipeline
- vollständig statisch nutzbar

Das ermöglicht schnelle Erstellung und einfache Verteilung, zum Beispiel als ZIP oder über GitHub Pages.
