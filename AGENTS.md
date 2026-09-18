# Familie Gossler — Kiro Arbeitsauftrag

## Ziel
Bringe diese private Familien-Webanwendung von einem fortgeschrittenen Prototypen zu einem
getesteten, sicheren, deploybaren Release. Funktionale Parität mit der öffentlich sichtbaren
Referenz ist erwünscht; fremder Quellcode, Texte, Bilder, Wappen oder sonstige geschützte Assets
dürfen nicht kopiert werden.

## Prioritäten
1. Datenschutz und Zugriffskontrolle
2. genealogische Korrektheit
3. funktionale Parität
4. robuste Tests
5. responsive/accessibility Qualität
6. visuelle Feinabstimmung

## Nicht verhandelbar
- Keine erfundenen Familiendaten.
- Unsichere Daten als ungeklärt markieren.
- Keine Secrets in `public/`, Git oder Logs.
- Supabase Service Role niemals im Browser.
- Gastzugang darf keine privaten Kontakte liefern.
- Frontend-Berechtigungen sind kein Sicherheitsmechanismus; RLS/RPC muss erzwingen.
- Keine produktive Veröffentlichung, solange Release Gate nicht PASS ist.
- Änderungen müssen Tests oder eine dokumentierte Begründung erhalten.
- Vor destruktiven Datenbank-/Git-Operationen Benutzerfreigabe verlangen.

## Arbeitsweise
Lies zuerst `KIRO_START_HERE.md`, dann `.kiro/steering/` und die Spec unter
`.kiro/specs/production-finish/`. Nutze unabhängige Reviewer-Agenten. Der Implementierer darf
seine eigene Arbeit nicht als alleinige Freigabequelle verwenden.


## 1:1-Paritätsziel

Ab jetzt ist das Produktziel **vollständige Funktions- und Ansichtsparität** mit der
öffentlich sichtbaren Petersdorff-Webseite bzw. ihrem öffentlich dokumentierten Verhalten.

Das bedeutet:
- jede sichtbare Ansicht hat ein Gossler-Gegenstück;
- jede sichtbare Interaktion hat denselben Zweck und Ablauf;
- Zustände, Navigation, Zoom/Pan/Collapse/Highlight und Rollen-Flows werden nachgebildet;
- die Datenbasis und Assets sind ausschließlich Gossler-eigen;
- fremder Code und fremde Assets werden nicht ungeprüft kopiert.

Die öffentliche Petersdorff-Architektur ist Referenz-Spezifikation. Bei Abweichung zwischen
unserem bisherigen Prototyp und der Referenz gewinnt die Referenz, außer Datenschutz,
Security oder genealogische Korrektheit verlangen eine bewusst dokumentierte Abweichung.
