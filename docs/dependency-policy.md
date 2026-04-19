# Dependency Policy

## Ziel

Dieses Projekt soll Abhängigkeiten zu Fremdbibliotheken bewusst und nachvollziehbar einsetzen.  
Jede neu eingeführte Bibliothek muss technisch notwendig, lizenzrechtlich akzeptabel und in der Dokumentation sichtbar sein.

## Grundregeln

1. Neue Abhängigkeiten dürfen nur aufgenommen werden, wenn sie einen klaren Mehrwert bringen.
2. Vor der Aufnahme muss geprüft werden:
   - Zweck der Bibliothek
   - Lizenztyp
   - Pflichten bei Weitergabe oder Veröffentlichung
   - Sicherheits- und Wartungszustand
3. Jede Fremdbibliothek muss in `THIRD_PARTY_NOTICES.md` genannt werden.
4. Wenn möglich, sollen weit verbreitete und aktiv gepflegte Bibliotheken bevorzugt werden.
5. Unnötige oder doppelte Abhängigkeiten sind zu vermeiden.
6. CDN-Abhängigkeiten gelten ebenfalls als echte Drittanbieter-Abhängigkeiten und müssen genauso dokumentiert werden wie npm-Abhängigkeiten.
7. Bei Dual-Lizenz-Modellen ist die konkret verwendete Lizenz ausdrücklich zu dokumentieren.

## Erlaubte Vorgehensweise bei neuen Abhängigkeiten

Vor dem Merge einer neuen Abhängigkeit sollte mindestens Folgendes vorliegen:

- Name der Bibliothek
- Version oder Versionsbereich
- Bezugsquelle
- Lizenz
- kurze Begründung für die Nutzung

## Lizenzanforderungen

Für jede Bibliothek ist zu prüfen:

- Muss ein Lizenztext mitgeliefert werden?
- Müssen Copyright-Hinweise beibehalten werden?
- Gibt es Copyleft-Pflichten?
- Gibt es Dokumentations- oder Attributionspflichten?

## Dokumentationspflicht

Bei jeder neuen oder geänderten Abhängigkeit sind diese Dateien zu prüfen und bei Bedarf anzupassen:

- `THIRD_PARTY_NOTICES.md`
- `.github/workflows/dependency-license-check.yml`
- diese Datei hier, falls sich die Projektregeln ändern

## Besondere Hinweise für dieses Projekt

Da dieses Projekt aktuell als statische Webanwendung arbeitet, können Abhängigkeiten auf mehreren Wegen eingebunden werden:

- direkte CDN-Imports in JavaScript-Dateien
- ESM-Imports aus externen Quellen
- klassische `package.json`-Abhängigkeiten
- HTML-Einbindungen externer Ressourcen

Alle diese Wege sind gleichwertig zu prüfen.

## Nicht gewünschte Fälle

Folgende Fälle sollen vermieden werden:

- Aufnahme einer Bibliothek nur aus Bequemlichkeit ohne echten Nutzen
- Einbindung einer Bibliothek ohne dokumentierte Lizenzprüfung
- Verwendung veralteter oder nicht mehr gepflegter Bibliotheken ohne gute Begründung
- versteckte Fremdabhängigkeiten über CDN ohne Eintrag in `THIRD_PARTY_NOTICES.md`

## Praktischer Ablauf bei einer neuen Bibliothek

1. Bibliothek technisch bewerten
2. Lizenz prüfen
3. Eintrag in `THIRD_PARTY_NOTICES.md` ergänzen
4. Code einbauen
5. GitHub Action erfolgreich laufen lassen
6. Review durchführen

## Review-Mindestfrage

Vor Freigabe eines PRs mit neuer Abhängigkeit sollte die Antwort auf diese Frage klar sein:

**Wissen wir, welche Bibliothek eingebunden wurde, unter welcher Lizenz sie steht und welche Pflichten daraus folgen?**
