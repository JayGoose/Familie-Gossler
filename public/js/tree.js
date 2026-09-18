
import { state } from "./state.js";
import { indexGraph, shortestPath } from "./relationship.js";
import { CONFIG } from "./config.js";

function connectedIds(g,root){const seen=new Set(),q=[root];while(q.length){const x=q.shift();if(!x||seen.has(x))continue;seen.add(x);for(const c of g.children.get(x)||[])q.push(c);for(const p of g.parents.get(x)||[])q.push(p);for(const p of g.partners.get(x)||[])q.push(p.id);}return seen;}
function year(p) {
  return p?.birth_date ? Number(String(p.birth_date).slice(0,4)) : 9999;
}

export function roots(people, relations) {
  const g = indexGraph(people, relations);
  return people.filter(p => (g.parents.get(p.id) || []).length === 0);
}

function descendants(g, root, depth = 0, out = [], visited = new Set()) {
  if (!root || visited.has(root)) return out;
  visited.add(root);
  out.push({ id: root, depth });

  if (state.collapsed.has(root)) return out;
  const kids = [...(g.children.get(root) || [])]
    .sort((a,b) => year(g.P.get(a)) - year(g.P.get(b)));

  for (const c of kids) descendants(g, c, depth + 1, out, visited);
  return out;
}

export function renderTree(container, onPerson) {
  const g = indexGraph(state.people, state.relations);
  const availableRoots = roots(state.people, state.relations);
  const rootId = state.treeRootId || availableRoots[0]?.id || state.people[0]?.id;
  if (!rootId) {
    container.innerHTML = `<div class="empty">Noch keine Personen vorhanden.</div>`;
    return;
  }

  const nodes = descendants(g, rootId);
  const byDepth = new Map();
  for (const n of nodes) {
    if (!byDepth.has(n.depth)) byDepth.set(n.depth, []);
    byDepth.get(n.depth).push(n.id);
  }

  const path = new Set(state.meId && state.selectedId
    ? shortestPath(g, state.meId, state.selectedId)
    : []);

  container.innerHTML = `
    <div class="tree-stage" id="treeStage">
      <div class="tree-grid">
        ${[...byDepth.entries()].map(([depth, ids]) => `
          <section class="tree-generation" data-depth="${depth}">
            ${ids.map(id => card(g, id, path, onPerson)).join("")}
          </section>
        `).join("")}
      </div>
      ${renderDisconnected(g,rootId,path)}<div class="minimap" id="treeMinimap"></div>
    </div>`;

  container.querySelectorAll("[data-person]").forEach(el => {
    el.addEventListener("click", e => {
      if (e.target.closest("[data-collapse]")) return;
      onPerson(el.dataset.person);
    });
  });

  container.querySelectorAll("[data-collapse]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = btn.dataset.collapse;
      if (state.collapsed.has(id)) state.collapsed.delete(id);
      else state.collapsed.add(id);
      renderTree(container, onPerson);
    });
  });

  buildMinimap(container);
}

function card(g, id, path, onPerson) {
  const p = g.P.get(id);
  const partners = g.partners.get(id) || [];
  const kids = g.children.get(id) || [];
  const isMe = state.meId === id;
  const inPath = path.has(id);
  const isDead = !!p.death_date;

  return `
  <article class="tree-card ${p.gender || "u"} ${isDead ? "dead" : ""} ${isMe || inPath ? "path" : ""}"
           data-person="${id}">
    <div class="tree-name">${isMe ? "➤ " : ""}${p.first_name || ""} ${p.last_name || ""}</div>
    <div class="tree-years">
      ${p.birth_date ? "✶ " + String(p.birth_date).slice(0,4) : ""}
      ${p.death_date ? " † " + String(p.death_date).slice(0,4) : ""}
    </div>
    ${partners.map(x => {
      const q = g.P.get(x.id);
      return `<button class="partner-pill" data-partner="${x.id}" title="Partnerprofil öffnen">${x.former ? "⚮" : "∞"} ${q?.first_name || ""} ${q?.last_name || ""}</button>`;
    }).join("")}
    ${kids.length ? `<button class="collapse-btn" data-collapse="${id}" title="Nachkommen ein-/ausklappen">${state.collapsed.has(id) ? "+" : "−"}</button>` : ""}
    ${p.is_registered ? `<span class="member-dot" title="Registriertes Mitglied"></span>` : ""}
  </article>`;
}

function buildMinimap(container) {
  const stage = container.querySelector("#treeStage");
  const mini = container.querySelector("#treeMinimap");
  if (!stage || !mini) return;

  const cards = [...container.querySelectorAll(".tree-card")];
  if (!cards.length) return;
  mini.innerHTML = cards.slice(0,60).map((c,i) =>
    `<span style="left:${(i%10)*9+5}%;top:${Math.floor(i/10)*13+8}%"></span>`
  ).join("");

  mini.addEventListener("click", () => {
    stage.scrollTo({ left: stage.scrollWidth/2 - stage.clientWidth/2, top: 0, behavior:"smooth" });
  });
}

function renderDisconnected(g,rootId,path){const c=connectedIds(g,rootId),ids=[...g.P.keys()].filter(id=>!c.has(id));if(!ids.length)return "";return `<section class="disconnected-block"><h3>Unverbundene Personen</h3><p>Noch nicht in diesen Stammbaum eingehängt.</p><div class="disconnected-grid">${ids.map(id=>card(g,id,path)).join("")}</div></section>`;}
