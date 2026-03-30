# Manifestformat `slides.json`

## Minimalbeispiel

```json
{
  "title": "Meine Slideshow",
  "slides": [
    {
      "id": "intro",
      "title": "Einführung",
      "content": "slides/01-intro.md",
      "format": "md",
      "audio": {
        "type": "txt",
        "src": "audio/01-intro.txt",
        "lang": "de-DE"
      }
    }
  ]
}
```

## Felder

### Root

- `title`: optionaler Titel der Slideshow
- `slides`: Array mit Folienobjekten

### Slide

- `id`: optionale technische ID
- `title`: optionaler Anzeigename
- `content`: Pfad zur Folienquelle
- `format`: optional `md` oder `wm`
- `audio`: optionales Audioobjekt

### Audio

- `type`: `txt`, `ssml` oder `mp3`
- `src`: Pfad zur Audio- bzw. Textquelle
- `lang`: optional, relevant für TTS
- `voice`: optionaler Browser-Voice-Name
- `rate`: optional
- `pitch`: optional
- `volume`: optional

## Pfadauflösung

Pfadangaben sind relativ zu:

- dem Root des SLD- oder ZIP-Archivs
- dem gewählten lokalen Verzeichnis
- dem Verzeichnis, in dem `slides.json` liegt

## Dateiendung `.sld`

Für Slideshows wird bevorzugt die Dateiendung `.sld` verwendet. Technisch kann eine `.sld`-Datei wie ein ZIP-Container aufgebaut sein.

Der Viewer behandelt deshalb `.sld` und `.zip` beim lokalen Öffnen gleich. Standardmäßig wird jedoch `.sld` als das bevorzugte Slideshow-Dokumentformat dargestellt.


## Showtime für Folien ohne Audio

Wenn eine Folie kein Audio besitzen soll, kann der `audio`-Block entfallen. Stattdessen kann ein Attribut `showtime` gesetzt werden.

`showtime` gibt die Anzeigedauer der Folie in Sekunden an.

### Beispiel

```json
{
  "id": "slide-ohne-audio",
  "content": "slide-ohne-audio.md",
  "showtime": 8
}
```

Im automatischen Präsentationsmodus bleibt die Folie dann 8 Sekunden sichtbar und es wird danach automatisch zur nächsten Folie gewechselt.
