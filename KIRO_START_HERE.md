# Kiro — Start Here

Dieses Repository ist für den Abschluss in Kiro vorbereitet.

## Empfohlener Ablauf

1. Ordner in Kiro öffnen.
2. Workspace als vertrauenswürdig bestätigen.
3. `AGENTS.md` und `.kiro/steering/` werden als Projektregeln verwendet.
4. In Specs `production-finish` öffnen.
5. Zuerst Task 1 „Baseline erstellen“ ausführen.
6. Danach mit `gossler-builder` implementieren.
7. Vor Release getrennt `security-reviewer`, `genealogy-reviewer` und
   `parity-reviewer` einsetzen.
8. Zum Schluss `release-reviewer` ausführen.

## Erster Prompt an Kiro

> Öffne die Spec `production-finish`. Lies AGENTS.md und alle Workspace-Steering-Dateien.
> Beginne ausschließlich mit Task 1 Baseline. Führe alle vorhandenen Audits und Tests aus,
> ändere noch keinen Produktcode und schreibe die Ergebnisse nach docs/KIRO_FINDINGS.md.
> Danach zeige mir die priorisierte Fehlerliste.

## Wichtig
Die enthaltenen Familiendaten können noch ungeprüfte oder aus früheren Prototypen übernommene
Werte enthalten. Kiro darf sie nicht als verifiziert behandeln. Der produktive Supabase-Zugang,
Mail-Secrets und echte Deployment-Zugangsdaten gehören nicht ins Repository.


## Nach der Baseline: 1:1-Paritätsauftrag

> Lies die aktuelle öffentliche Petersdorff-ARCHITECTURE.md und FEATURE_SPECIFICATION.md.
> Fülle zuerst docs/PETERSDORFF_REFERENCE_MATRIX.md mit dem aktuellen Referenzverhalten.
> Danach arbeite Tasks 11–19 der production-finish-Spec ab. Der bisherige ring.js-Prototyp
> gilt nicht als fertiger Fächer. Implementiere einen echten Nachkommen-Sunburst in fan.js
> und eine SVG-Stammtafel nach den dokumentierten Referenzprinzipien. Verwende ausschließlich
> Gossler-Daten und eigene Assets. Kopiere keinen fremden Code ungeprüft. Lass abschließend
> den unabhängigen parity-reviewer jede Matrixzeile prüfen.
