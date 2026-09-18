
import { state } from "./state.js";
import { indexGraph } from "./relationship.js";

function roman(n) {
  const map=[["X",10],["IX",9],["V",5],["IV",4],["I",1]];
  let s=""; for(const [c,v] of map) while(n>=v){s+=c;n-=v;} return s;
}

const collapsedGenerations=new Set();\nexport function renderGeneration(container, onPerson) {
  const g=indexGraph(state.people,state.relations);
  const root=state.treeRootId||state.people[0]?.id;
  const depth=new Map([[root,0]]),q=[root];

  while(q.length){
    const x=q.shift(),d=depth.get(x);
    for(const c of g.children.get(x)||[]) if(!depth.has(c)){depth.set(c,d+1);q.push(c);}
  }

  const max=Math.max(0,...depth.values());
  container.innerHTML=[...Array(max+1)].map((_,d)=>{
    const ids=[...depth.entries()].filter(x=>x[1]===d).map(x=>x[0])
      .sort((a,b)=>String(g.P.get(a).birth_date||"9999").localeCompare(String(g.P.get(b).birth_date||"9999")));
    return `<section class="generation-row">
      <header><button class="generation-toggle" data-gen="${d}">${collapsedGenerations.has(d)?"+":"−"}</button><span>${roman(d+1)}</span><small>Generation seit Stammvater</small></header>
      <div class="${collapsedGenerations.has(d)?"collapsed":""}">${ids.map(id=>{
        const p=g.P.get(id);
        const fam=(p.last_name||"").toLowerCase().includes("goßler")||(p.last_name||"").toLowerCase().includes("gossler"); return `<button class="generation-person ${state.meId===id?"me":""} ${fam?"family-surname":""}" data-person="${id}">
          ${p.is_registered?"<strong>":""}${p.first_name||""} ${p.last_name||""}${p.is_registered?"</strong>":""}
          <small>${p.birth_date?String(p.birth_date).slice(0,4):"—"}</small>
        </button>`;
      }).join("")}</div>
    </section>`;
  }).join("");

  container.querySelectorAll("[data-person]").forEach(x=>x.onclick=()=>onPerson(x.dataset.person)); container.querySelectorAll("[data-gen]").forEach(x=>x.onclick=()=>{const d=Number(x.dataset.gen);collapsedGenerations.has(d)?collapsedGenerations.delete(d):collapsedGenerations.add(d);renderGeneration(container,onPerson);});
}
