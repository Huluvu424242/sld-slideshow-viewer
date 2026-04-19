# 📽️ SLD Slideshow Viewer

Ein **rein browserbasierter Viewer für Markdown-basierte Foliensätze mit optionalem Audio**.

Das Projekt ermöglicht es, Präsentationen ohne spezielle Software direkt im Browser abzuspielen – inklusive Audio, TTS-Fallback und automatischem Folienwechsel.

---

## 🚀 Features

* 📂 **Lokale Verzeichnisse laden** (File System Access API)
* 📦 **SLD / ZIP Dateien öffnen**
* 🌍 **Remote Slideshows laden** (über URL)
* 📝 **Markdown-Rendering** (inkl. Bilder)
* 🗣️ **Audio pro Folie**

    * echte Audio-Dateien
    * Text / SSML (TTS im Browser)
* ⏱️ **Automatischer Folienwechsel (showtime)**
* 🔁 **Autoplay & Navigation**
* 📱 **Swipe- und Touchsteuerung**
* 🔔 **Akustische Übergänge (Glocken / Gong)**
* 👁️ **Transkriptanzeige (Audio/Text)**
* ⚠️ **Fallbacks bei fehlendem Audio oder Browser-Support**

---

## 🧱 Architektur

Das Projekt ist bewusst minimal gehalten:

* **Keine Build-Tools**
* **Kein Node.js erforderlich**
* **Keine Backend-Komponenten**

Eine detaillierte Modulbeschreibung steht in [`docs/architecture.md`](docs/architecture.md).

Technologie:

* HTML + CSS + Vanilla JavaScript
* ESM-Imports direkt über CDN
* Browser APIs:

    * File System Access API
    * SpeechSynthesis (TTS)
    * AudioContext

---

## 📂 Unterstützte Quellen

### 1. Lokales Verzeichnis

* Auswahl über „Verzeichnis öffnen“
* benötigt Chromium-basierte Browser

### 2. `.sld` / `.zip`

* Standardformat für portable Slideshows
* enthält:

    * `slides.json`
    * Markdown-Dateien
    * Audio-Dateien
    * Assets (z. B. Bilder)

### 3. Remote URL

Beispiel:

```
https://example.org/my-slideshow/
https://example.org/my-slideshow/slides.json
https://example.org/my-slideshow.sld
```

⚠️ Einschränkung:
Remote-Zugriffe funktionieren nur, wenn der Server **CORS erlaubt**.

---

## 🧾 Slideshow-Format

### Manifest (`slides.json`)

```json
{
  "title": "Beispiel",
  "slides": [
    {
      "content": "slide1.md",
      "audio": "slide1.mp3",
      "showtime": 10
    }
  ]
}
```

### Eigenschaften

| Feld       | Pflicht                | Beschreibung          |
| ---------- |------------------------| --------------------- |
| `id`       | optional               | eindeutige ID         |
| `content`  | ja                     | Pfad zur Inhaltsdatei |
| `audio`    | optional wenn showtime | Audioquelle           |
| `showtime` | optional wenn audio    | Dauer in Sekunden     |

➡️ Eine Folie benötigt **entweder Audio oder showtime**

---

## 📝 Unterstützte Formate

### Markdown (`.md`)

* wird über `marked` gerendert

### Wiki-Markup (`.wm`)

* einfache eigene Syntax

### Audio

* `.mp3`, `.wav`, etc.
* `.txt` oder `.ssml` → wird per TTS gesprochen

---

## 🔊 Audio-Verhalten

| Situation        | Verhalten               |
| ---------------- | ----------------------- |
| Audio vorhanden  | wird abgespielt         |
| Text / SSML      | wird per TTS gesprochen |
| kein Audio       | showtime wird genutzt   |
| Browser ohne TTS | Fallback auf showtime   |

---

## ⚠️ Browser-Kompatibilität

Empfohlen:

* ✅ Google Chrome
* ✅ Chromium-basierte Browser

Eingeschränkt:

* ⚠️ Mozilla Firefox (TTS / File API limitiert)

---

## 📁 Projektstruktur

```
/
├── index.html
├── src/
│   ├── app.js
│   ├── loaders.js
│   ├── wiki-parser.js
│   ├── audio.js
│   └── ...
├── docs/
│   ├── createslideshow.md
│   ├── architecture.md
│   └── ...
├── THIRD_PARTY_NOTICES.md
└── .github/workflows/
```

---


## 📚 Dokumentation

Eine zentrale Übersicht aller Doku-Teile findest du in [`docs/README.md`](docs/README.md).

Direktlinks:

* [Architektur](docs/architecture.md)
* [Slideshow erstellen](docs/createslideshow.md)
* [Manifestformat](docs/manifest.md)
* [SLD-Spezifikation](docs/sld-spec.md)
* [Dependency Policy](docs/dependency-policy.md)
* [License Review Checklist](docs/license-review-checklist.md)
* [Roadmap](docs/roadmap.md)

---

## ⚖️ Drittanbieter-Abhängigkeiten

Aktuell werden folgende Bibliotheken verwendet:

* `marked` (Markdown Parser)
* `DOMPurify` (Sanitizing von gerendertem HTML)
* `JSZip` (ZIP/SLD Verarbeitung)

👉 Details siehe:
`THIRD_PARTY_NOTICES.md`

---

## 🛡️ Dependency & License Governance

Dieses Projekt verfolgt einen bewussten Umgang mit Abhängigkeiten.

### Regeln

* Jede Bibliothek muss dokumentiert sein
* Lizenz muss geprüft werden
* CDN-Imports zählen als echte Abhängigkeiten

👉 Details:

* `docs/dependency-policy.md`
* `docs/license-review-checklist.md`

---

## 🤖 Automatische Prüfung (GitHub Actions)

Eine GitHub Action prüft:

* erkannte Abhängigkeiten (inkl. CDN)
* Abgleich mit `THIRD_PARTY_NOTICES.md`

Datei:

```
.github/workflows/dependency-license-check.yml
```

Die Action schlägt fehl, wenn:

* eine Bibliothek verwendet wird
* aber nicht dokumentiert ist

---

## 🧪 Entwicklung

Projekt lokal starten:

```bash
# einfach im Browser öffnen
index.html
```

oder über einfachen Server:

```bash
python -m http.server
```

---
## 🌐 Nutzung auf Webservern (z. B. nginx)

Damit `.sld`-Dateien korrekt ausgeliefert werden, sollte dein Webserver einen passenden MIME-Type setzen.

### 📦 Empfohlener MIME-Type (aktuell)

```text
application/vnd.sld.slideshow+zip
```

Dieser MIME-Type ist aktuell **noch nicht offiziell registriert**, folgt aber der gängigen Konvention für Vendor-Formate (`vnd.*`) und kann problemlos verwendet werden.

---

## ⚙️ Beispiel: nginx Konfiguration

Füge in deiner nginx-Konfiguration (z. B. `mime.types` oder `nginx.conf`) folgenden Eintrag hinzu:

```nginx
types {
    application/vnd.sld.slideshow+zip sld;
}
```

Oder innerhalb eines Server-Blocks:

```nginx
location ~ \.sld$ {
    add_header Content-Type application/vnd.sld.slideshow+zip;
}
```

---

## 🚀 Beispiel: Hosting einer Slideshow

Angenommen, deine Datei liegt hier:

```text
https://example.org/slides/demo.sld
```

Dann kannst du den Viewer so aufrufen:

```text
https://huluvu424242.github.io/sld-slideshow-viewer/?url=https://example.org/slides/demo.sld
```

---

## ⚠️ Wichtige Hinweise

### CORS (Cross-Origin Requests)

Wenn du `.sld`-Dateien von einem anderen Server lädst, muss dieser CORS erlauben:

```nginx
add_header Access-Control-Allow-Origin *;
```

Ohne diese Einstellung kann der Browser die Datei nicht laden.

---

### Content-Type ist entscheidend

Wenn der MIME-Type **nicht gesetzt ist**, passiert oft:

* Datei wird als `application/zip` behandelt
* oder Download statt Anzeige
* oder Fehler beim Laden im Viewer

👉 Daher unbedingt korrekt konfigurieren

---

## 🔮 Zukunft

Langfristig ist geplant, den MIME-Type offiziell registrieren zu lassen.
Bis dahin gilt:

```text
application/vnd.sld.slideshow+zip
```

als empfohlener Standard.

---

## 💡 Optional: Fallback

Falls dein Server keine MIME-Anpassung erlaubt, kannst du als Fallback auch verwenden:

```text
application/zip
```

Der Viewer erkennt `.sld` trotzdem korrekt, da es sich technisch um ein ZIP-Archiv handelt.

---

## 📌 Roadmap (Auszug)

* bessere Offline-Unterstützung
* stabilere TTS-Integration
* optionales Pre-Rendering von Audio
* Erweiterung des SLD-Formats

---

## 📜 Lizenz

Projektlizenz siehe:

```
LICENSE
```

---

## 💡 Idee hinter dem Projekt

Ziel ist es, einen **leichtgewichtigen, offenen Präsentationsstandard** zu schaffen:

* Markdown statt PowerPoint
* Audio statt Live-Vortrag
* Browser statt spezieller Software
* ZIP/SLD statt proprietärer Formate

---

## 🔗 Links

* GitHub:
  https://github.com/Huluvu424242/sld-slideshow-viewer

* Beispiel Präsentation mit Viewer Aufruf
  https://huluvu424242.github.io/sld-slideshow-viewer/?url=https://huluvu424242.github.io/foile-pile/explainations/mesh/meshnetze/slides.json

* Weitere Slides Sammlung:
  https://huluvu424242.github.io/foile-pile/

---

## 🧠 Hinweis

Dieses Projekt ist bewusst **einfach gehalten**.
Es soll zeigen, wie weit man mit:

* Standard-Webtechnologien
* offenen Formaten
* minimaler Architektur

kommen kann.
