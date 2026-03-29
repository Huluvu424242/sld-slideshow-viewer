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

- dem Root des ZIP-Archivs
- dem gewählten lokalen Verzeichnis
- dem Verzeichnis, in dem `slides.json` liegt
