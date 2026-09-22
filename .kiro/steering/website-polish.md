---
inclusion: manual
---
# Website-Polish (vollständiger Review- und Verbesserungslauf)

Aufruf: „Führe den vollständigen Website-Polish nach dieser Regel aus."
Ablage: projektlokal (R6 „erst lokal, dann global" — Umzug nach `~/.kiro/` erst nach
Bewährung in drei Projekten).

Rolle: erfahrener Webdesigner, UX/UI-Designer und Frontend-Entwickler. Ziel ist eine
Seite, die hochwertig, modern, ruhig, professionell, konsistent, schnell, responsiv,
vertrauenswürdig und conversion-orientiert wirkt — und ausdrücklich NICHT wie eine
generische KI-Landingpage.

## Arbeitsreihenfolge (verbindlich)
Analyse → Designsystem → Verbesserungsplan → Umsetzung → Responsive-Prüfung →
Funktionsprüfung → visueller Polish. Nicht sofort Code ändern; erst analysieren.
Kleinere Designentscheidungen selbst treffen; nur bei Auswirkung auf Inhalt, Marke oder
Grundfunktion nachfragen.

## Prüf- und Verbesserungsraster
1. Analyse (noch nicht umbauen): Struktur, Hierarchie, Hero, Navigation, Typografie,
   Farben, Abstände, Grid/Content-Breite, Bildsprache, Buttons, Cards, Formulare, CTAs,
   Wiederholungen, visuelle Unruhe, Responsive/Mobile, Animationen, Hover, Ladezeiten,
   Bildgrößen, technische Auffälligkeiten. Einteilen in: gut / verbessern / neu.
2. Design-System ableiten: Farben (primär/sekundär/neutral), Typo-Skala (H1–H3, Body,
   klein), Buttons, Radius, Schatten, Grid, max. Content-Breite, Seitenränder,
   Section-/Component-Abstände, Bildradien, Icon-Stil, Animationstempo, Hover. Zentrale
   Design Tokens statt Einzelwerte.
3. Visuelle Hierarchie: klare Hauptbotschaft, Überschriftenhierarchie, Whitespace,
   maßvolle Kontraste, gruppierte Inhalte, Blickführung.
4. Hero: sofort verständlich, starke H1, wenig Text, klarer Primary-CTA, ~1 Viewport,
   nicht grundlos >100vh.
5. Spacing/Layout systematisieren: Section-Rhythmus, gleiche Abstände, konsistente
   Paddings/Breiten, klares Grid, keine willkürlichen Margins/Max-Widths.
6. Typografie: klare Skala H1→H2→H3→Body, gute Zeilenlängen/Line-Heights, konsistente
   Weights, saubere mobile Skalierung; keine übergroßen KI-Headlines.
7. Components vereinheitlichen: Buttons, Cards, Nav, Formularfelder, FAQ, Footer, Icons,
   Badges, Trust-Elemente — ein Element = ein Prinzip. Keine uneinheitlichen
   Radien/Schatten/Card-Stile.
8. Interaktionen/Animationen: subtil, funktional, sparsam; vorhandene Lib nutzen, keine
   neue schwere Dependency nur für Animation.
9. Generischen KI-Look vermeiden: kein Glassmorphism-Overkill, keine Neonverläufe, keine
   dekorativen Elemente ohne Funktion. Bevorzugt: restrained, editorial, timeless,
   intentional, understated, premium.
10. Conversion: klarer nächster Schritt, CTA-Platzierung, Kontakt, Trust — nicht penetrant.
11. Responsive: Desktop groß, Laptop, Tablet, Smartphone, sehr klein. Nav, Hero,
    Headlines, lange Wörter, Bildzuschnitte, Buttons, Cards, Formulare, Abstände,
    horizontales Overflow. Layout muss sich reorganisieren, nicht nur schrumpfen.
12. Performance: Bildgrößen/-formate (WebP/AVIF), responsive images, Lazy Loading,
    unnötige Libs/Fonts, Render-Blocking, Layout-Shifts.
13. Accessibility: Kontraste, sichtbare Focus-States, semantisches HTML, Heading-Reihen-
    folge, Alt-Texte, echte Buttons, Formular-Labels, Tastaturbedienung.
14. Inhalte NICHT erfinden (deckungsgleich mit `.kiro/steering/genealogy.md`): keine
    erfundenen Bewertungen, Zahlen, Standorte, Referenzen, Zertifikate, Firmendaten.
    Fehlendes erhalten oder klar als Platzhalter markieren.
15. Implementierung: bestehende Architektur/Komponenten/Libs/Stylesystem bevorzugen; kein
    Rewrite ohne messbaren Grund und Nutzerfreigabe (siehe `.kiro/steering/tech.md`).
16. QA nach Umbau: Alignment, Abstände, Typografie, Konsistenz; Nav/Links/Buttons/
    Formulare/Mobile-Nav; Desktop/Tablet/Mobile; Console-/Build-Fehler, Broken Assets,
    Overflow, Performance. Gefundene Probleme direkt beheben.
17. Abschluss-Polish: pro Abschnitt fragen — notwendig? Hierarchie klar? genug Ruhe?
    vereinfachbar? wirkt es nach Template/KI? Proportionen sauber?

## Projektbindung (nicht verhandelbar, aus den bestehenden Steering-Dateien)
- Datenschutz/RLS, keine Secrets im Frontend, Gast ohne Kontaktdaten (`security.md`).
- Keine erfundenen Familiendaten (`genealogy.md`).
- Referenz bleibt Petersdorff-Parität (`parity-1to1.md`), aber eigene Optik ist erlaubt.
- Vor Deploy: `python scripts/security_guard.py`, `python scripts/clone_audit.py`,
  `node --test tests/` grün.
