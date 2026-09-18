
// VERALTET / NICHT PARITÄT: ring.js ist ein einfacher konzentrischer Punkt-Ring
// und gilt seit Task 8 NICHT mehr als Fächer-Paritätsansicht. Der echte
// Nachkommen-Sunburst ist public/js/fan.js (Layout in fan-layout.js).
// Diese Datei bleibt vorerst nur als Fallback erhalten und wird nicht mehr
// in den Ansichtsumschalter aufgenommen.
import { state } from "./state.js";
import { indexGraph } from "./relationship.js";

export function renderRing(container, onPerson) {
  const g = indexGraph(state.people, state.relations);
  const root = state.treeRootId || state.people[0]?.id;
  if (!root) return;

  const dist = new Map([[root,0]]);
  const q = [root];
  while (q.length) {
    const x = q.shift();
    const d = dist.get(x);
    if (d >= 6) continue;
    for (const c of g.children.get(x) || []) {
      if (!dist.has(c)) { dist.set(c,d+1); q.push(c); }
    }
  }

  const groups = [...dist.entries()].reduce((m,[id,d]) => {
    (m[d] ||= []).push(id); return m;
  }, {});

  const size = 980, cx=size/2, cy=size/2, step=72;
  let svg = `<svg viewBox="0 0 ${size} ${size}" class="ring-svg">`;
  for (let d=1; d<=6; d++) svg += `<circle cx="${cx}" cy="${cy}" r="${d*step}" fill="none" stroke="#d6d1c8"/>`;

  Object.entries(groups).forEach(([ds,ids]) => {
    const d = Number(ds), r=d*step;
    ids.forEach((id,i) => {
      const p=g.P.get(id), a=(2*Math.PI*i/ids.length)-Math.PI/2;
      const x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r;
      const color=p.gender==="m"?"#9dbce6":p.gender==="f"?"#e9b1c4":"#d2cec5";
      svg += `<g class="ring-person" data-person="${id}" tabindex="0">
        <circle cx="${x}" cy="${y}" r="${d===0?28:18}" fill="${color}" class="${state.meId===id?"ring-me":""}"/>
        <text x="${x}" y="${y+34}" text-anchor="middle">${escapeXml(p.first_name || "")}</text>
        <g class="ring-actions"><text x="${x-28}" y="${y-22}" class="ring-action" data-action="relationship" data-target="${id}">?</text><text x="${x}" y="${y-28}" class="ring-action" data-action="child" data-target="${id}">+</text><text x="${x+28}" y="${y-22}" class="ring-action" data-action="sibling" data-target="${id}">+</text><text x="${x+34}" y="${y+5}" class="ring-action" data-action="partner" data-target="${id}">∞</text></g>
      </g>`;
    });
  });
  svg += `</svg>`;
  container.innerHTML = svg;
  container.querySelectorAll("[data-person]").forEach(x=>x.addEventListener("click",e=>{if(e.target.closest("[data-action]"))return;onPerson(x.dataset.person);}));
  container.querySelectorAll("[data-action]").forEach(x=>x.addEventListener("click",e=>{e.stopPropagation();document.dispatchEvent(new CustomEvent("gossler:ring-action",{detail:{action:x.dataset.action,targetId:x.dataset.target}}));}));
}

function escapeXml(x) { return x.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c])); }
