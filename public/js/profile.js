
import { state, setState } from "./state.js";
import { indexGraph, relationshipSummary } from "./relationship.js";
import { canEditPerson, canEditRelations, canDeletePlaceholder, canReadContacts } from "./permissions.js";
import { savePerson, saveVita, addRelation, deletePlaceholder, auditEvent, uploadProfilePicture, removeProfilePicture, signedProfilePictureUrl } from "./api.js";
import { renderMarkdown, wrapSelection } from "./markdown.js";
import { showQrModal } from "./qr.js";

function personName(p){return [p?.first_name,p?.last_name].filter(Boolean).join(" ");}

export function openProfile(personId, {full=false}={}) {
  const g=indexGraph(state.people,state.relations),p=g.P.get(personId);
  if(!p)return;
  setState({selectedId:personId});

  const existing=document.querySelector(".profile-overlay");
  if(existing) existing.remove();

  const rel=state.meId?relationshipSummary(g,state.meId,personId):null;
  const parents=(g.parents.get(personId)||[]).map(id=>g.P.get(id));
  const children=(g.children.get(personId)||[]).map(id=>g.P.get(id));
  const partners=(g.partners.get(personId)||[]).map(x=>({...g.P.get(x.id),former:x.former}));

  const overlay=document.createElement("div");
  overlay.className="profile-overlay";
  overlay.innerHTML=`
  <article class="profile-panel ${full?"full":""}">
    <button class="close" data-close>×</button>
    <div class="profile-head"><div class="profile-photo-wrap"><div class="profile-photo" data-photo>👤</div>${canEditPerson(p)?`<div class="profile-photo-actions"><button data-photo-upload>Foto hochladen</button>${p.photo_path?`<button data-photo-remove>Foto löschen</button>`:""}</div>`:""}</div><div><h1>${personName(p)||"Unbenannt"}</h1><div class="profile-subtitle">${p.birth_name?`geb. ${p.birth_name}`:""}</div></div></div>
    <div class="profile-actions">
      ${state.meId?`<button data-relationship>Wie sind wir verwandt?</button>`:""}
      <button data-full-page>Ganze Seite öffnen</button><button data-show-tree>Im Stammbaum zeigen</button><button data-qr>QR-Code zeigen</button>
      ${canEditPerson(p)?`<button data-edit>Eigenschaften bearbeiten</button><button data-vita>Vita bearbeiten</button>`:""}
      ${canDeletePlaceholder(p)?`<button data-delete class="danger">Platzhalter löschen</button>`:""}
    </div>

    ${rel?`<section class="relationship-card">
      <h3>Verwandtschaft — ${rel.label}</h3>
      <div>So seid ihr verbunden</div>
      <p>${rel.path.map(id=>personName(g.P.get(id))).join(" → ")}</p>
      <div>Gemeinsamer Vorfahre — ${rel.commonAncestorId?personName(g.P.get(rel.commonAncestorId)):"—"}</div>
      <div>Gemeinsame DNA — ${rel.dnaPercent==null?"—":rel.dnaPercent.toFixed(2)+" % (Näherung)"}</div>
    </section>`:""}

    <section><h3>Details</h3><dl class="details">
      <dt>Geburtsdatum</dt><dd>${p.birth_date||"—"}</dd>
      <dt>Sterbedatum</dt><dd>${p.death_date||"—"}</dd>
      <dt>Geschlecht</dt><dd>${p.gender||"—"}</dd>
      <dt>Beruf</dt><dd>${p.profession||"—"}</dd>
      <dt>Wohnort</dt><dd>${p.residence||"—"}</dd>
      <dt>Kontakt</dt><dd>${canReadContacts()?[p.email,p.phone].filter(Boolean).join(" · ")||"—":"—"}</dd>
    </dl></section>

    <section><h3>Vita</h3><div class="vita">${renderMarkdown(p.vita_markdown||"—")}</div></section>

    <section><h3>Verbindungen</h3>
      <div class="connection-list">
        ${parents.map(x=>`<button data-person="${x.id}">Elternteil · ${personName(x)}</button>`).join("")}
        ${partners.map(x=>`<button data-person="${x.id}">${x.former?"⚮":"∞"} ${personName(x)}</button>`).join("")}
        ${children.map(x=>`<button data-person="${x.id}">Kind · ${personName(x)}</button>`).join("")}
      </div>
      ${canEditRelations()?`<button data-add-connection>+ Neue Verbindung</button>`:""}
    </section>
  </article>`;

  document.body.appendChild(overlay);
  overlay.querySelector("[data-close]").onclick=()=>overlay.remove();
  overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove();});
  overlay.querySelectorAll("[data-person]").forEach(x=>x.onclick=()=>openProfile(x.dataset.person));
  overlay.querySelector("[data-full-page]")?.addEventListener("click",()=>document.dispatchEvent(new CustomEvent("gossler:open-full-profile",{detail:{personId}})));
  overlay.querySelector("[data-show-tree]")?.addEventListener("click",()=>{overlay.remove();document.dispatchEvent(new CustomEvent("gossler:show-in-tree",{detail:{personId}}));});
  overlay.querySelector("[data-qr]")?.addEventListener("click",()=>showQrModal(personId));
  overlay.querySelector("[data-edit]")?.addEventListener("click",()=>editPerson(p));
  overlay.querySelector("[data-vita]")?.addEventListener("click",()=>editVita(p));
  overlay.querySelector("[data-add-connection]")?.addEventListener("click",()=>addConnection(p));
  (async()=>{const h=overlay.querySelector("[data-photo]");if(p.photo_path&&h){const u=await signedProfilePictureUrl(p.photo_path);if(u)h.innerHTML=`<img src="${u}" alt="Profilbild">`;}})();
  overlay.querySelector("[data-photo-upload]")?.addEventListener("click",()=>{const i=document.createElement("input");i.type="file";i.accept="image/jpeg,image/png,image/webp";i.onchange=async()=>{const f=i.files?.[0];if(!f)return;if(f.size>8*1024*1024)return alert("Bild bitte unter 8 MB.");await uploadProfilePicture(p.id,f);await auditEvent("profile_picture_uploaded","person",p.id);location.reload();};i.click();});
  overlay.querySelector("[data-photo-remove]")?.addEventListener("click",async()=>{if(confirm("Profilbild entfernen?")){await removeProfilePicture(p.id,p.photo_path);await auditEvent("profile_picture_removed","person",p.id);location.reload();}});
  overlay.querySelector("[data-delete]")?.addEventListener("click",async()=>{
    if(confirm("Platzhalter wirklich löschen?")){
      await deletePlaceholder(p.id); location.reload();
    }
  });
}

function editPerson(p){
  const modal=document.createElement("div");
  modal.className="modal";
  modal.innerHTML=`<form class="modal-card" id="personForm">
    <h2>Profil bearbeiten</h2>
    <label>Vorname *<input name="first_name" required value="${p.first_name||""}"></label>
    <label>Nachname *<input name="last_name" required value="${p.last_name||""}"></label>
    <label>Geburtsname<input name="birth_name" value="${p.birth_name||""}" placeholder="geb. ..."></label>
    <label>Geschlecht *<select name="gender"><option value="m">Mann</option><option value="f">Frau</option><option value="u">Divers/offen</option></select></label>
    <label>Geburtsdatum<input name="birth_date" type="date" value="${p.birth_date||""}"></label>
    <label>Sterbedatum<input name="death_date" type="date" value="${p.death_date||""}"></label>
    <label>Beruf<input name="profession" value="${p.profession||""}"></label>
    <label>Wohnort<input name="residence" value="${p.residence||""}"></label>
    <label>E-Mail<input name="email" type="email" value="${p.email||""}"></label>
    <label>Telefon<input name="phone" value="${p.phone||""}"></label>
    <div class="row"><button type="submit">Speichern</button><button type="button" data-cancel>Abbrechen</button></div>
  </form>`;
  document.body.appendChild(modal);
  modal.querySelector("[name=gender]").value=p.gender||"u";
  modal.querySelector("[data-cancel]").onclick=()=>modal.remove();
  modal.querySelector("form").onsubmit=async e=>{
    e.preventDefault();
    const payload=Object.fromEntries(new FormData(e.currentTarget));
    await savePerson({...p,...payload}); await auditEvent("person_updated","person",p.id); modal.remove(); location.reload();
  };
}

function editVita(p){
  const modal=document.createElement("div");
  modal.className="modal";
  modal.innerHTML=`<div class="modal-card">
    <h2>Vita</h2>
    <div class="editor-toolbar">
      <button data-tool="h1">H1</button><button data-tool="h2">H2</button>
      <button data-tool="b"><b>B</b></button><button data-tool="i"><i>I</i></button>
      <button data-tool="bullet">• Liste</button><button data-tool="numbered">1. Liste</button><button data-tool="quote">„ Zitat</button>
      <button data-tool="link">Link</button><button data-tool="hr">—</button>
    </div>
    <textarea id="vitaEditor" rows="18">${p.vita_markdown||""}</textarea>
    <p class="hint">Markdown: # Überschrift, **fett**, *kursiv*, - Liste, > Zitat, [Text](https://…)</p>
    <div class="row"><button data-save>Speichern</button><button data-cancel>Abbrechen</button></div>
  </div>`;
  document.body.appendChild(modal);
  const ta=modal.querySelector("#vitaEditor");
  modal.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>{
    const t=b.dataset.tool;
    if(t==="h1")wrapSelection(ta,"# ","");
    if(t==="h2")wrapSelection(ta,"## ","");
    if(t==="b")wrapSelection(ta,"**","**");
    if(t==="i")wrapSelection(ta,"*","*");
    if(t==="bullet")wrapSelection(ta,"- ",""); if(t==="numbered")wrapSelection(ta,"1. ","");
    if(t==="quote")wrapSelection(ta,"> ","");
    if(t==="link")wrapSelection(ta,"[Text](",")");
    if(t==="hr")wrapSelection(ta,"\n---\n","");
  });
  modal.querySelector("[data-cancel]").onclick=()=>modal.remove();
  modal.querySelector("[data-save]").onclick=async()=>{await saveVita(p.id,ta.value); await auditEvent("vita_updated","person",p.id); await auditEvent("relation_added","person",p.id,{other,type}); modal.remove();location.reload();};
}

function addConnection(p){
  const options=state.people.filter(x=>x.id!==p.id).map(x=>
    `<option value="${x.id}">${personName(x)}</option>`).join("");
  const modal=document.createElement("div");
  modal.className="modal";
  modal.innerHTML=`<form class="modal-card">
    <h2>Neue Verbindung</h2>
    <label>Beziehungstyp<select name="type"><option value="parent">Elternteil → Person</option><option value="child">Person → Kind</option><option value="partner">Partner/in</option></select></label>
    <label>Person suchen<select name="other">${options}</select></label>
    <label><input type="checkbox" name="former"> ehemalige Partnerschaft</label>
    <div class="row"><button type="submit">Verbindung hinzufügen</button><button type="button" data-cancel>Abbrechen</button></div>
  </form>`;
  document.body.appendChild(modal);
  modal.querySelector("[data-cancel]").onclick=()=>modal.remove();
  modal.querySelector("form").onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget),type=fd.get("type"),other=fd.get("other");
    if(type==="parent")await addRelation(other,p.id,"parent",false);
    else if(type==="child")await addRelation(p.id,other,"parent",false);
    else await addRelation(p.id,other,"partner",fd.get("former")==="on");
    modal.remove();location.reload();
  };
}
