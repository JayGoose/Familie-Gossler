# Design — Production Finish

## Architekturprinzip
Kein unnötiger Rewrite. Bestehende ES-Module bleiben erhalten; Supabase bleibt Backend.

## Trust Boundaries
Browser ist nicht vertrauenswürdig.
Supabase RLS/RPC/Storage Policies bilden die Autorisierungsgrenze.
Edge Functions dürfen Service-Role nur serverseitig verwenden.

## Testschichten
1. Static audits: secrets, required surfaces.
2. Unit: relationship graph/invariants.
3. Integration: Supabase policies/RPCs.
4. Browser E2E: auth + role flows.
5. Visual/responsive: Baum/Ring/Profile/Admin.
6. Independent security review.

## Reviewer-Prinzip
Implementierung und Freigabe sind getrennt:
- builder implementiert
- security-reviewer prüft Security
- genealogy-reviewer prüft Beziehungen
- parity-reviewer prüft Referenzverhalten
- release-reviewer entscheidet anhand Evidenz

## Evidence
Jeder erledigte Task dokumentiert:
- geänderte Dateien
- ausgeführte Tests
- Ergebnis
- verbleibende Risiken


# Referenzgetriebene Visualisierungsarchitektur

## Fan module
Neues Zielmodul: `public/js/fan.js`.
`ring.js` gilt nach erfolgreicher Ablösung nicht mehr als Paritätsimplementierung.

Öffentliche API soll mindestens die Referenzzwecke abbilden:
- init
- render / setFamily / setPreferredFamily
- setColorMode(gender|year|name)
- centerOn
- panTo
- highlightConnection
- clearHighlight
- family-change callback
- semantische Zoomstufe
- Rotation
- Timeline attach/detach im Year-Modus

Layout:
1. Familienwurzel bestimmen.
2. Nachkommenbaum bauen.
3. Blattgewicht je Person berechnen.
4. Winkelspanne rekursiv nach Blattgewicht verteilen.
5. Generation auf Ringradius abbilden.
6. Partner im Host-Segment rendern.
7. Label-Spezifikation je Zoomstufe berechnen.
8. Highlights unabhängig vom Layout rendern.

## Tree module
`tree.js` muss von Generationen-Kartenlayout auf echte SVG-Stammtafel umgebaut werden.
Knotenlayout arbeitet auf Person+Partner-Einheiten und Teilbaumkonturen.

## Shared family model
Fan, Tree und Gotha verwenden dieselbe graphbasierte Familien-/Zweigberechnung.
Keine drei getrennten Heuristiken.
