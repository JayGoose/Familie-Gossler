// Erzeugt eine schlanke Demo-Graph-Datei fuer die lokale Faecher-Demo.
// Nur id, Vorname, Nachname, Geburtsjahr, Geschlecht + Beziehungen im DB-Schema.
// KEINE Kontaktdaten, KEINE Notizen. Ausgabe liegt in private_seed/ (gitignored),
// nicht in public/ -> es gelangen keine privaten Daten in versionierbare Pfade.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const seed = JSON.parse(readFileSync(join(root, "private_seed", "gossler.seed.json"), "utf-8"));

const people = seed.people.map(p => {
  const parts = (p.name || "").trim().split(/\s+/);
  return {
    id: p.id,
    first_name: parts[0] || "",
    last_name: parts.length > 1 ? parts[parts.length - 1] : "",
    gender: p.gender || "u",
    birth_date: p.birth || null,
    death_date: p.death || null,
    status: p.status
  };
});

const relations = seed.relations.map(r => ({
  person_a: r.a,
  person_b: r.b,
  relation_type: r.type,
  former: !!r.former
}));

const out = { people, relations };
// Ausgabe nach public/demo-graph.json, damit der lokale Server sie liefern kann.
// Diese Datei ist in .gitignore ausgenommen -> sie wird NICHT versioniert und
// gelangt nie ins oeffentliche Repo. Reine lokale Ansichts-Demo.
const dest = join(root, "public", "demo-graph.json");
writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(`Demo-Graph geschrieben: ${dest}`);
console.log(`  people: ${people.length}, relations: ${relations.length}`);
