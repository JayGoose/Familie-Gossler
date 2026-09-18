
export function indexGraph(people, relations) {
  const P = new Map(people.map(p => [p.id, p]));
  const parents = new Map();
  const children = new Map();
  const partners = new Map();

  for (const p of people) {
    parents.set(p.id, []);
    children.set(p.id, []);
    partners.set(p.id, []);
  }

  for (const r of relations) {
    if (r.relation_type === "parent") {
      parents.get(r.person_b)?.push(r.person_a);
      children.get(r.person_a)?.push(r.person_b);
    } else if (r.relation_type === "partner") {
      partners.get(r.person_a)?.push({ id: r.person_b, former: !!r.former, relationId: r.id });
      partners.get(r.person_b)?.push({ id: r.person_a, former: !!r.former, relationId: r.id });
    }
  }

  return { P, parents, children, partners };
}

function genderWord(person, male, female, neutral = "Person") {
  return person?.gender === "m" ? male : person?.gender === "f" ? female : neutral;
}

export function siblingKind(g, a, b) {
  const pa = g.parents.get(a) || [];
  const pb = g.parents.get(b) || [];
  const common = pa.filter(x => pb.includes(x));
  if (common.length >= 2) return "full";
  if (common.length === 1) return "half";
  return null;
}

export function ancestorDepths(g, id, maxDepth = 20) {
  const m = new Map([[id, 0]]);
  const q = [[id, 0]];
  while (q.length) {
    const [x, d] = q.shift();
    if (d >= maxDepth) continue;
    for (const p of g.parents.get(x) || []) {
      if (!m.has(p)) {
        m.set(p, d + 1);
        q.push([p, d + 1]);
      }
    }
  }
  return m;
}

export function shortestPath(g, start, target) {
  if (!start || !target) return [];
  const adjacency = new Map([...g.P.keys()].map(id => [id, []]));

  for (const [child, ps] of g.parents.entries()) {
    for (const parent of ps) {
      adjacency.get(parent)?.push(child);
      adjacency.get(child)?.push(parent);
    }
  }
  for (const [id, ps] of g.partners.entries()) {
    for (const p of ps) adjacency.get(id)?.push(p.id);
  }

  const q = [[start, [start]]];
  const seen = new Set([start]);
  while (q.length) {
    const [x, path] = q.shift();
    if (x === target) return path;
    for (const n of adjacency.get(x) || []) {
      if (!seen.has(n)) {
        seen.add(n);
        q.push([n, [...path, n]]);
      }
    }
  }
  return [];
}

export function commonAncestor(g, a, b) {
  const A = ancestorDepths(g, a);
  const B = ancestorDepths(g, b);
  return [...A.keys()]
    .filter(x => x !== a && x !== b && B.has(x))
    .map(id => ({ id, da: A.get(id), db: B.get(id) }))
    .sort((x, y) => (x.da + x.db) - (y.da + y.db))[0] || null;
}

export function relationshipLabel(g, me, other) {
  if (!me || !other) return "—";
  if (me === other) return "du selbst";

  const target = g.P.get(other);
  const myParents = g.parents.get(me) || [];
  const targetParents = g.parents.get(other) || [];

  if (myParents.includes(other)) return genderWord(target, "Vater", "Mutter");
  if (targetParents.includes(me)) return genderWord(target, "Sohn", "Tochter");

  const sib = siblingKind(g, me, other);
  if (sib) {
    // Vollgeschwister: großgeschrieben (Bruder/Schwester).
    // Halbgeschwister: Präfix "Halb" + kleingeschriebenes Grundwort (Halbbruder/Halbschwester).
    return sib === "half"
      ? "Halb" + genderWord(target, "bruder", "schwester")
      : genderWord(target, "Bruder", "Schwester");
  }

  for (const p of myParents) {
    if ((g.parents.get(p) || []).includes(other)) {
      return genderWord(target, "Großvater", "Großmutter");
    }
  }

  for (const p of targetParents) {
    if ((g.parents.get(p) || []).includes(me)) {
      return genderWord(target, "Enkel", "Enkelin");
    }
  }

  for (const p of myParents) {
    const sk = siblingKind(g, p, other);
    if (sk) {
      const sidePerson = g.P.get(p);
      const side = sidePerson?.gender === "m"
        ? " väterlicherseits"
        : sidePerson?.gender === "f"
          ? " mütterlicherseits"
          : "";
      return (sk === "half"
        ? "Halb" + genderWord(target, "onkel", "tante")
        : genderWord(target, "Onkel", "Tante")) + side;
    }
  }

  for (const p of targetParents) {
    const sk = siblingKind(g, me, p);
    if (sk) return sk === "half"
      ? "Halb" + genderWord(target, "neffe", "nichte")
      : genderWord(target, "Neffe", "Nichte");
  }

  const ca = commonAncestor(g, me, other);
  if (ca) {
    const degree = Math.max(1, Math.min(ca.da, ca.db) - 1);
    const removed = Math.abs(ca.da - ca.db);

    if (ca.da === 2 && ca.db === 2) return genderWord(target, "Cousin", "Cousine");
    if (ca.da === 2 && ca.db === 3) return genderWord(target, "Großcousin", "Großcousine");
    if (ca.da === 3 && ca.db === 2) {
      return genderWord(target,
        "Cousin 1. Grades, eine Generation älter",
        "Cousine 1. Grades, eine Generation älter");
    }

    return `${genderWord(target, "Cousin", "Cousine")} ${degree}. Grades` +
      (removed ? `, ${removed} Generation${removed > 1 ? "en" : ""} versetzt` : "");
  }

  for (const p of myParents) {
    if ((g.partners.get(p) || []).some(x => x.id === other)) {
      return genderWord(target, "Stiefvater", "Stiefmutter");
    }
  }
  return "familiär verbunden";
}

export function estimatedSharedDNA(g, a, b) {
  const ca = commonAncestor(g, a, b);
  if (!ca) return null;
  // Näherungswert für einfache Cousin-Beziehungen, kein medizinischer Wert.
  const meioses = ca.da + ca.db;
  return Math.pow(0.5, meioses - 1) * 100;
}

export function relationshipSummary(g, a, b) {
  const ca = commonAncestor(g, a, b);
  const path = shortestPath(g, a, b);
  return {
    label: relationshipLabel(g, a, b),
    path,
    commonAncestorId: ca?.id || null,
    dnaPercent: estimatedSharedDNA(g, a, b)
  };
}
