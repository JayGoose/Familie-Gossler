---
inclusion: always
---
# Projektstruktur

`public/` deploybares Frontend. Keine privaten Seeds oder Secrets hinein.
`public/js/` modulare UI-, Auth-, API-, Relationship- und Adminlogik.
`supabase/migrations/` versionierte DB-/RLS-/RPC-Änderungen.
`supabase/functions/` serverseitige Edge Functions.
`private_seed/` sensible Importdaten; niemals öffentlich deployen.
`scripts/` Audit/Seed-Helfer.
`tests/` automatisierte Tests.
`docs/` Architektur, Security, Parity und Runbooks.
`.kiro/` Kiro Steering, Agents, Hooks und Specs.

Bei Datenbankänderungen: neue Migration statt alte Produktionsmigration still umzuschreiben.
