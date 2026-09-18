
import { state } from "./state.js";

export function renderTimeline(container, onPerson) {
  const dated=state.people.filter(p=>p.birth_date && /^\d{4}/.test(String(p.birth_date)));
  if(!dated.length){container.innerHTML="<p>Keine Geburtsjahre vorhanden.</p>";return;}

  const years=dated.map(p=>Number(String(p.birth_date).slice(0,4)));
  const min=Math.min(...years)-5,max=Math.max(...years)+3;

  container.innerHTML=`
  <div class="timeline-controls">
    <label>Bis zum Jahr <output id="timelineYear">${max}</output></label>
    <input id="timelineSlider" type="range" min="${min}" max="${max}" value="${max}">
  </div>
  <div class="timeline-list" id="timelineList"></div>`;

  const slider=container.querySelector("#timelineSlider");
  const out=container.querySelector("#timelineYear");
  const list=container.querySelector("#timelineList");

  const paint=()=>{
    const y=Number(slider.value); out.textContent=y;
    list.innerHTML=dated.filter(p=>Number(String(p.birth_date).slice(0,4))<=y)
      .sort((a,b)=>String(a.birth_date).localeCompare(String(b.birth_date)))
      .map(p=>`<button class="timeline-person ${state.meId===p.id?"me":""}" data-person="${p.id}">
        <span>${String(p.birth_date).slice(0,4)}</span>
        <b>${p.first_name||""} ${p.last_name||""}</b>
      </button>`).join("");
    list.querySelectorAll("[data-person]").forEach(x=>x.onclick=()=>onPerson(x.dataset.person));
  };
  slider.oninput=paint; paint();
}
