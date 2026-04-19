# License Review Checklist

Diese Checkliste kann bei Pull Requests verwendet werden, die neue oder geänderte Drittanbieter-Abhängigkeiten enthalten.

## Technische Prüfung

- [ ] Die Bibliothek wird wirklich benötigt
- [ ] Es gibt keine einfachere vorhandene Lösung im Projekt
- [ ] Die Bibliothek wirkt aktiv gepflegt
- [ ] Die eingebaute Version ist bewusst gewählt

## Bezugsweg geprüft

- [ ] Einbindung über `package.json` geprüft
- [ ] Einbindung über CDN geprüft
- [ ] Einbindung über HTML-Script- oder Link-Tags geprüft
- [ ] Keine versteckten zusätzlichen Fremdquellen übersehen

## Lizenzprüfung

- [ ] Lizenz wurde identifiziert
- [ ] Lizenz ist mit dem Projekt vereinbar
- [ ] Bei Dual-Lizenz wurde die konkret genutzte Variante festgelegt
- [ ] Erforderliche Hinweise oder Lizenztexte sind bekannt

## Projektdokumentation

- [ ] `THIRD_PARTY_NOTICES.md` wurde ergänzt oder bestätigt
- [ ] Bei Bedarf wurde die Version eingetragen
- [ ] Die Quelle der Bibliothek ist dokumentiert
- [ ] Die Nutzung im Projekt ist kurz beschrieben

## CI / Qualitätssicherung

- [ ] `dependency-license-check.yml` läuft erfolgreich
- [ ] Der PR enthält keine unnötigen Zusatzabhängigkeiten
- [ ] Die Änderung ist für Reviewer nachvollziehbar

## Freigabe

Ein PR mit neuer Drittanbieter-Abhängigkeit sollte erst freigegeben werden, wenn alle relevanten Punkte oben geklärt sind.
